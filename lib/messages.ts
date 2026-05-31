// Firestore-backed chat messages + moderation.
//
// Schema:
//   messages/{autoId} = {
//     conversation: string,
//     sender: string,          — Firebase UID
//     senderName?: string,
//     body?: string,
//     image?: string,
//     createdAt, updatedAt
//   }
//
// Requires composite index: (conversation asc, createdAt asc).
//
// Moderation lives on users/{email}.moderation. detectAbuse() runs at write
// time; warnings accumulate in a rolling 24h window; 3 warnings → 24h
// chat ban. Mirrors the prior Mongo behavior.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { detectAbuse } from "@/lib/moderation";
import { ensureUser } from "@/lib/users";

const WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;
const BAN_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_WARNINGS = 3;

export type MessageRecord = {
  _id: string;
  conversation: string;
  sender: string;
  senderName?: string;
  body?: string;
  image?: string;
  createdAt: string;
  updatedAt?: string;
};

function tsToIso(ts: Timestamp | string | undefined): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === "string") return ts;
  return ts.toDate ? ts.toDate().toISOString() : new Date().toISOString();
}

function docToMessage(
  id: string,
  data: FirebaseFirestore.DocumentData
): MessageRecord {
  return {
    _id: id,
    conversation: data.conversation || "",
    sender: data.sender || "",
    senderName: data.senderName || "",
    body: data.body || "",
    image: data.image || "",
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export async function listMessages(
  conversationId: string
): Promise<MessageRecord[]> {
  const db = adminDb();
  const snap = await db
    .collection("messages")
    .where("conversation", "==", conversationId)
    .orderBy("createdAt", "asc")
    .limit(500)
    .get();
  return snap.docs.map((d) => docToMessage(d.id, d.data()));
}

type UserModeration = {
  email: string;
  warnings: Array<{ at: Timestamp | string }>;
  chatBannedUntil: Date | null;
};

/**
 * Looks up a user by Firebase UID. If not found and senderEmail is provided,
 * looks up by email, optionally linking the UID. If still not found, creates
 * the user using senderEmail/senderName.
 */
async function findOrCreateUser(input: {
  senderId: string;
  senderEmail?: string;
  senderName?: string;
}): Promise<UserModeration | null> {
  const db = adminDb();

  // 1. Try Firebase UID.
  const uidSnap = await db
    .collection("users")
    .where("firebaseUid", "==", input.senderId)
    .limit(1)
    .get();

  if (!uidSnap.empty) {
    const data = uidSnap.docs[0].data();
    return {
      email: data.email,
      warnings: data.moderation?.warnings || [],
      chatBannedUntil: data.moderation?.chatBannedUntil?.toDate?.() || null,
    };
  }

  // 2. Fall back to email lookup, link UID if found.
  if (input.senderEmail && input.senderEmail.trim()) {
    const email = input.senderEmail.trim().toLowerCase();
    const userRef = db.collection("users").doc(email);
    const snap = await userRef.get();
    if (snap.exists) {
      const data = snap.data() as FirebaseFirestore.DocumentData;
      if (!data.firebaseUid) {
        await userRef.update({ firebaseUid: input.senderId });
      }
      return {
        email,
        warnings: data.moderation?.warnings || [],
        chatBannedUntil: data.moderation?.chatBannedUntil?.toDate?.() || null,
      };
    }

    // 3. Auto-create on first chat.
    const username =
      input.senderName && input.senderName.trim()
        ? input.senderName.trim()
        : email.split("@")[0];
    try {
      await ensureUser({ email, username, firebaseUid: input.senderId });
      return { email, warnings: [], chatBannedUntil: null };
    } catch {
      return null;
    }
  }

  return null;
}

export type ModerationOutcome =
  | { kind: "ok"; userEmail: string }
  | { kind: "banned"; bannedUntil: string }
  | { kind: "warned"; warnings: number; remaining: number; userEmail: string }
  | { kind: "newly-banned"; bannedUntil: string; warnings: number; userEmail: string }
  | { kind: "no-user" };

/**
 * Runs moderation + warning/ban accounting. Returns an outcome describing
 * what to do next.
 *
 * - kind: "banned"      → reject (already-banned), include bannedUntil
 * - kind: "newly-banned"→ reject (3rd warning), include bannedUntil
 * - kind: "warned"      → reject (warning issued), include count/remaining
 * - kind: "ok"          → accept the write
 */
export async function moderateMessage(input: {
  senderId: string;
  senderEmail?: string;
  senderName?: string;
  body: string;
  conversationId: string;
}): Promise<ModerationOutcome> {
  const user = await findOrCreateUser({
    senderId: input.senderId,
    senderEmail: input.senderEmail,
    senderName: input.senderName,
  });
  if (!user) return { kind: "no-user" };

  const now = new Date();
  if (user.chatBannedUntil && user.chatBannedUntil > now) {
    return { kind: "banned", bannedUntil: user.chatBannedUntil.toISOString() };
  }

  const abuse = detectAbuse(input.body);
  if (!abuse.hit) return { kind: "ok", userEmail: user.email };

  const db = adminDb();
  const userRef = db.collection("users").doc(user.email);
  const windowStart = new Date(now.getTime() - WARNING_WINDOW_MS);
  const recentWarnings = user.warnings.filter((w) => {
    const ts = w.at instanceof Timestamp ? w.at.toDate() : new Date(String(w.at));
    return ts >= windowStart;
  });
  const warningCount = recentWarnings.length + 1;
  const warningRecord = {
    at: now,
    reason: "abuse",
    conversationId: input.conversationId,
    messagePreview: input.body.slice(0, 200),
  };

  if (warningCount >= MAX_WARNINGS) {
    const banUntil = new Date(now.getTime() + BAN_WINDOW_MS);
    await userRef.update({
      "moderation.warnings": FieldValue.arrayUnion(warningRecord),
      "moderation.chatBannedUntil": banUntil,
    });
    return {
      kind: "newly-banned",
      bannedUntil: banUntil.toISOString(),
      warnings: warningCount,
      userEmail: user.email,
    };
  }

  await userRef.update({
    "moderation.warnings": FieldValue.arrayUnion(warningRecord),
  });
  return {
    kind: "warned",
    warnings: warningCount,
    remaining: MAX_WARNINGS - warningCount,
    userEmail: user.email,
  };
}

export async function createMessage(input: {
  conversationId: string;
  senderId: string;
  senderName?: string;
  body: string;
  image?: string;
}): Promise<MessageRecord> {
  const db = adminDb();
  const ref = db.collection("messages").doc();
  await ref.set({
    conversation: input.conversationId,
    sender: input.senderId,
    senderName: input.senderName || "",
    body: input.body,
    image: input.image || "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Touch the conversation's lastMessageAt for sort/UX.
  await db
    .collection("conversations")
    .doc(input.conversationId)
    .set(
      { slug: input.conversationId, lastMessageAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  const fresh = await ref.get();
  return docToMessage(ref.id, fresh.data() as FirebaseFirestore.DocumentData);
}

export async function getMessage(id: string): Promise<MessageRecord | null> {
  const db = adminDb();
  const snap = await db.collection("messages").doc(id).get();
  if (!snap.exists) return null;
  return docToMessage(snap.id, snap.data() as FirebaseFirestore.DocumentData);
}

export async function updateMessageBody(
  id: string,
  senderId: string,
  newBody: string
): Promise<MessageRecord | null> {
  const db = adminDb();
  const ref = db.collection("messages").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as FirebaseFirestore.DocumentData;
  if (data.sender !== senderId) throw new Error("Unauthorized");

  await ref.update({
    body: newBody,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const fresh = await ref.get();
  return docToMessage(ref.id, fresh.data() as FirebaseFirestore.DocumentData);
}

export async function deleteMessage(
  id: string,
  senderId: string
): Promise<boolean | "unauthorized"> {
  const db = adminDb();
  const ref = db.collection("messages").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data() as FirebaseFirestore.DocumentData;
  if (data.sender !== senderId) return "unauthorized";
  await ref.delete();
  return true;
}
