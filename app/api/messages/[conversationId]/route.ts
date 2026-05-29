import { NextRequest, NextResponse } from "next/server";
import { db, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { detectAbuse } from "@/lib/moderation";
import { normalizeEmail, toDate, toIso } from "@/lib/firestore-helpers";

const WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;
const BAN_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_WARNINGS = 3;

type ModerationWarning = {
  at?: Timestamp | Date | string;
};

type ModerationState = {
  warnings?: ModerationWarning[];
  chatBannedUntil?: Timestamp | Date | string;
};

type UserRecord = {
  email?: string;
  username?: string;
  firebaseUid?: string;
  moderation?: ModerationState;
};

const GHOST_TTL_MS = 24 * 60 * 60 * 1000;

async function cleanupExpiredMessages(conversationId: string) {
  const expired = await db
    .collection("messages")
    .where("conversation", "==", conversationId)
    .where("ghostExpiresAt", "<=", Timestamp.now())
    .limit(50)
    .get();

  if (expired.empty) return;

  const batch = db.batch();
  expired.docs.forEach((doc: any) => batch.delete(doc.ref));
  await batch.commit();
}

async function resolveUser(
  senderId: string,
  senderEmail?: string,
  senderName?: string
) {
  const users = db.collection("users");
  const byId = await users.doc(senderId).get();
  if (byId.exists) {
    return { ref: byId.ref, data: byId.data() as UserRecord };
  }

  const byUid = await users
    .where("firebaseUid", "==", senderId)
    .limit(1)
    .get();
  if (!byUid.empty) {
    const doc = byUid.docs[0];
    return { ref: doc.ref, data: doc.data() as UserRecord };
  }

  const email = normalizeEmail(senderEmail);
  if (!email) {
    return null;
  }

  const byEmail = await users.where("email", "==", email).limit(1).get();
  if (!byEmail.empty) {
    const doc = byEmail.docs[0];
    const data = doc.data() as UserRecord;
    if (!data.firebaseUid) {
      await doc.ref.set({ firebaseUid: senderId }, { merge: true });
    }
    return { ref: doc.ref, data };
  }

  const username =
    typeof senderName === "string" && senderName.trim()
      ? senderName.trim()
      : email.split("@")[0];

  const newDocRef = users.doc(senderId);
  const payload: UserRecord & Record<string, unknown> = {
    email,
    username,
    firebaseUid: senderId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await newDocRef.set(payload);
  return { ref: newDocRef, data: payload };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params; // await here

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    await cleanupExpiredMessages(conversationId);

    const snapshot = await db
      .collection("messages")
      .where("conversation", "==", conversationId)
      .orderBy("createdAt", "asc")
      .get();

    const messages = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        _id: doc.id,
        ...data,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
        ghostExpiresAt: toIso(data.ghostExpiresAt),
      };
    });

    return NextResponse.json(messages, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> } // params is a Promise here too
) {
  try {
    const { conversationId } = await context.params; // <-- await added

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const body = await req.json();
    const {
      senderId,
      senderName,
      senderEmail,
      body: messageBody,
      image,
      ghost,
      attachments,
    } = body;

    if (!senderId || (!messageBody && !Array.isArray(attachments))) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userRecord = await resolveUser(senderId, senderEmail, senderName);
    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRecord.data;

    const now = new Date();
    const bannedUntil = user.moderation?.chatBannedUntil;
    const bannedUntilDate = toDate(bannedUntil);
    if (bannedUntilDate && bannedUntilDate > now) {
      return NextResponse.json(
        {
          error: "You are temporarily banned from chat.",
          bannedUntil: bannedUntilDate.toISOString(),
        },
        { status: 403 }
      );
    }

    const abuse = detectAbuse(String(messageBody || ""));
    if (abuse.hit) {
      const windowStart = new Date(now.getTime() - WARNING_WINDOW_MS);
      const warnings = user.moderation?.warnings || [];
      const recentWarnings = warnings.filter((w: ModerationWarning) => {
        const warningDate = toDate(w.at);
        return warningDate ? warningDate >= windowStart : false;
      });
      const warningCount = recentWarnings.length + 1;

      const warningRecord = {
        at: Timestamp.fromDate(now),
        reason: "abuse",
        conversationId,
        messagePreview: String(messageBody).slice(0, 200),
      };

      const updatedWarnings = [...warnings, warningRecord].slice(-20);
      const moderationUpdate: ModerationState = {
        ...(user.moderation || {}),
        warnings: updatedWarnings,
      };

      if (warningCount >= MAX_WARNINGS) {
        const banUntil = new Date(now.getTime() + BAN_WINDOW_MS);
        moderationUpdate.chatBannedUntil = Timestamp.fromDate(banUntil);
        await userRecord.ref.set(
          { moderation: moderationUpdate },
          { merge: true }
        );
        return NextResponse.json(
          {
            error: "You have been temporarily banned from chat for 24 hours.",
            warnings: warningCount,
            bannedUntil: banUntil.toISOString(),
          },
          { status: 403 }
        );
      }

      await userRecord.ref.set(
        { moderation: moderationUpdate },
        { merge: true }
      );
      return NextResponse.json(
        {
          error: "Abusive language detected. This is a warning.",
          warnings: warningCount,
          remaining: MAX_WARNINGS - warningCount,
        },
        { status: 400 }
      );
    }

    await cleanupExpiredMessages(conversationId);

    const nowTs = Timestamp.now();
    const ghostExpiresAt = ghost
      ? Timestamp.fromMillis(nowTs.toMillis() + GHOST_TTL_MS)
      : null;
    const safeAttachments = Array.isArray(attachments)
      ? attachments.slice(0, 6).map((file: any) => ({
          url: String(file?.url || ""),
          secureUrl: String(file?.secureUrl || file?.url || ""),
          name: String(file?.name || "Attachment").slice(0, 160),
          type: String(file?.type || "file").slice(0, 80),
          size: Number(file?.size || 0),
          format: String(file?.format || "").slice(0, 40),
          resourceType: String(file?.resourceType || "raw").slice(0, 20),
        }))
      : [];

    const messageRef = await db.collection("messages").add({
      conversation: conversationId,
      sender: senderId,
      senderName: senderName || "",
      body: messageBody || "",
      image: image || "",
      ghost: Boolean(ghost),
      ghostExpiresAt,
      attachments: safeAttachments,
      reactions: {},
      bookmarks: [],
      createdAt: nowTs,
      updatedAt: nowTs,
    });

    const created = await messageRef.get();
    const data = created.data() || {};

    return NextResponse.json(
      {
        _id: messageRef.id,
        ...data,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
        ghostExpiresAt: toIso(data.ghostExpiresAt),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error saving message:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


