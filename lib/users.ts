// Firestore-backed user helpers.
//
// Doc id strategy: users/{normalizedEmail}. All emails lowercased + trimmed
// before lookup or write — call normalizeEmail() at the boundary.
//
// `solvedQuestions` stays as an inline array on the user doc for now; if any
// user crosses ~500 entries, move it to a `users/{email}/solved/{qid}` subcollection.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type SolvedEntry = {
  questionId: string;
  solvedAt: string;
  submittedAnswer?: string;
  language?: string;
  executionStats?: { time?: number; memory?: number };
};

export type UserStats = {
  totalSolved: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  favoriteLanguage: string;
  longestStreak: number;
  currentStreak: number;
  lastActiveDate: string | null;
};

export type UserPreferences = {
  defaultLanguage: "Javascript" | "Python" | "Java" | "C++";
  theme: "light" | "dark" | "auto";
  soundEnabled: boolean;
  showDifficulty: boolean;
};

export type UserDoc = {
  email: string;
  username: string;
  name?: string;
  firebaseUid?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  status?: "Online" | "Idle" | "Busy" | "Offline";
  activity?: string;
  lastSeen?: Timestamp;
  solvedQuestions: SolvedEntry[];
  stats: UserStats;
  preferences: UserPreferences;
  moderation?: {
    warnings?: Array<{
      at: Timestamp | string;
      reason: string;
      conversationId?: string;
      messagePreview?: string;
    }>;
    chatBannedUntil?: Timestamp;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const v = email.trim().toLowerCase();
  return v.length > 0 ? v : null;
}

function defaultStats(): UserStats {
  return {
    totalSolved: 0,
    easyCount: 0,
    mediumCount: 0,
    hardCount: 0,
    favoriteLanguage: "Javascript",
    longestStreak: 0,
    currentStreak: 0,
    lastActiveDate: null,
  };
}

function defaultPreferences(): UserPreferences {
  return {
    defaultLanguage: "Javascript",
    theme: "auto",
    soundEnabled: true,
    showDifficulty: true,
  };
}

export async function getUser(email: string): Promise<UserDoc | null> {
  const db = adminDb();
  const snap = await db.collection("users").doc(email).get();
  if (!snap.exists) return null;
  return snap.data() as UserDoc;
}

/**
 * Idempotent: creates the user doc if it doesn't exist, links firebaseUid if
 * provided and not already set. Returns the up-to-date doc.
 */
export async function ensureUser(input: {
  email: string;
  username: string;
  firebaseUid?: string;
  name?: string;
}): Promise<{ user: UserDoc; created: boolean }> {
  const db = adminDb();
  const ref = db.collection("users").doc(input.email);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const existing = snap.data() as UserDoc;
      const patch: { [k: string]: unknown } = {};
      if (input.firebaseUid && !existing.firebaseUid) {
        patch.firebaseUid = input.firebaseUid;
      }
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = FieldValue.serverTimestamp();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tx.update(ref, patch as any);
      }
      return { existed: true, data: { ...existing, ...patch } as UserDoc };
    }

    const fresh: Partial<UserDoc> = {
      email: input.email,
      username: input.username,
      name: input.name || "",
      bio: "",
      location: "",
      website: "",
      phone: "",
      status: "Offline",
      activity: "",
      solvedQuestions: [],
      stats: defaultStats(),
      preferences: defaultPreferences(),
    };
    if (input.firebaseUid) fresh.firebaseUid = input.firebaseUid;

    const toCreate = {
      ...fresh,
      lastSeen: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    tx.set(ref, toCreate);
    return { existed: false, data: fresh as UserDoc };
  });

  return { user: result.data, created: !result.existed };
}

export async function bumpHeartbeat(email: string): Promise<boolean> {
  const db = adminDb();
  const ref = db.collection("users").doc(email);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ lastSeen: FieldValue.serverTimestamp() });
  return true;
}

const PROFILE_FIELD_LIMITS = {
  bio: 280,
  location: 100,
  website: 200,
  phone: 30,
  username: 50,
} as const;

type ProfileField = keyof typeof PROFILE_FIELD_LIMITS;
const PROFILE_FIELDS: ProfileField[] = ["bio", "location", "website", "phone", "username"];

export type ProfilePatch = Partial<Record<ProfileField, string>> & {
  preferences?: Partial<UserPreferences>;
};

export class UsernameTakenError extends Error {
  constructor() {
    super("Username already taken");
    this.name = "UsernameTakenError";
  }
}

export class FieldTooLongError extends Error {
  constructor(public field: string, public max: number) {
    super(`${field} must be ${max} characters or fewer`);
    this.name = "FieldTooLongError";
  }
}

/**
 * Patch the user doc. Validates username uniqueness via a query (Firestore
 * doesn't have unique indexes outside the doc id). Username collisions race —
 * for stricter correctness use a `usernames/{username}` reservation doc.
 */
export async function updateUserProfile(
  email: string,
  patch: ProfilePatch
): Promise<UserDoc> {
  const db = adminDb();
  const ref = db.collection("users").doc(email);
  const update: Record<string, unknown> = {};

  for (const field of PROFILE_FIELDS) {
    const v = patch[field];
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (trimmed.length > PROFILE_FIELD_LIMITS[field]) {
      throw new FieldTooLongError(field, PROFILE_FIELD_LIMITS[field]);
    }
    update[field] = trimmed;
  }

  if (patch.preferences) {
    const p = patch.preferences;
    if (
      typeof p.defaultLanguage === "string" &&
      ["Javascript", "Python", "Java", "C++"].includes(p.defaultLanguage)
    ) {
      update["preferences.defaultLanguage"] = p.defaultLanguage;
    }
    if (typeof p.theme === "string" && ["light", "dark", "auto"].includes(p.theme)) {
      update["preferences.theme"] = p.theme;
    }
    if (typeof p.soundEnabled === "boolean") {
      update["preferences.soundEnabled"] = p.soundEnabled;
    }
    if (typeof p.showDifficulty === "boolean") {
      update["preferences.showDifficulty"] = p.showDifficulty;
    }
  }

  if (Object.keys(update).length === 0) {
    throw new Error("No editable fields provided");
  }

  if (typeof update.username === "string") {
    const newUsername = update.username as string;
    const taken = await db
      .collection("users")
      .where("username", "==", newUsername)
      .limit(1)
      .get();
    if (!taken.empty && taken.docs[0].id !== email) {
      throw new UsernameTakenError();
    }
  }

  update.updatedAt = FieldValue.serverTimestamp();
  await ref.update(update);

  const fresh = await ref.get();
  if (!fresh.exists) throw new Error("User not found");
  return fresh.data() as UserDoc;
}

type AddSolvedInput = {
  questionId: string;
  difficulty?: "easy" | "medium" | "hard";
  submittedAnswer?: string;
  language?: string;
  executionStats?: { time?: number; memory?: number };
};

/**
 * Atomic: appends to solvedQuestions if not already there, bumps totalSolved,
 * difficulty counter, streak, lastActiveDate. Returns whether the question
 * was newly added.
 */
export async function addSolvedQuestion(
  email: string,
  input: AddSolvedInput
): Promise<{ added: boolean; alreadySolved: boolean }> {
  const db = adminDb();
  const ref = db.collection("users").doc(email);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("User not found");
    const user = snap.data() as UserDoc;

    const already = (user.solvedQuestions || []).some(
      (sq) => sq.questionId === input.questionId
    );
    if (already) return { added: false, alreadySolved: true };

    const now = new Date();
    const entry: SolvedEntry = {
      questionId: input.questionId,
      solvedAt: now.toISOString(),
      submittedAnswer: input.submittedAnswer || "",
      language: input.language || "Javascript",
      executionStats: input.executionStats || {},
    };

    const stats: UserStats = { ...defaultStats(), ...(user.stats || {}) };
    stats.totalSolved = (stats.totalSolved || 0) + 1;
    if (input.difficulty === "easy") stats.easyCount = (stats.easyCount || 0) + 1;
    else if (input.difficulty === "medium")
      stats.mediumCount = (stats.mediumCount || 0) + 1;
    else if (input.difficulty === "hard")
      stats.hardCount = (stats.hardCount || 0) + 1;

    const lastActive = stats.lastActiveDate ? new Date(stats.lastActiveDate) : null;
    const daysDiff = lastActive
      ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    if (daysDiff <= 1) {
      stats.currentStreak = (stats.currentStreak || 0) + 1;
      stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);
    } else {
      stats.currentStreak = 1;
      stats.longestStreak = Math.max(stats.longestStreak || 0, 1);
    }
    stats.lastActiveDate = now.toISOString();

    tx.update(ref, {
      solvedQuestions: FieldValue.arrayUnion(entry),
      stats,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { added: true, alreadySolved: false };
  });
}

export async function listUsers(limit = 200): Promise<UserDoc[]> {
  const db = adminDb();
  const snap = await db
    .collection("users")
    .orderBy("lastSeen", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as UserDoc);
}

/**
 * Prefix search on username. Case-sensitive. Good enough for the network
 * widget — swap to Algolia if you ever need fuzzy/contains search.
 */
export async function searchUsersByUsername(
  prefix: string,
  limit = 10
): Promise<UserDoc[]> {
  const p = prefix.trim();
  if (!p) return [];
  const db = adminDb();
  const end = p + "";
  const snap = await db
    .collection("users")
    .where("username", ">=", p)
    .where("username", "<", end)
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as UserDoc);
}
