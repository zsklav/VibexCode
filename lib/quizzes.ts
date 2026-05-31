// Firestore-backed quizzes.
// Collection: quizzes/{autoId}.
//   Stores ISO date string in `date` for predictable sort + comparison.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type Quiz = {
  _id: string;
  title: string;
  description: string;
  date: string;
  registrationLink: string;
  createdByEmail: string;
  createdAt?: string;
  updatedAt?: string;
};

export type QuizInput = {
  title: string;
  description?: string;
  date: string;
  registrationLink?: string;
  createdByEmail: string;
};

function tsToIso(ts: Timestamp | undefined): string {
  return ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
}

function docToQuiz(id: string, data: FirebaseFirestore.DocumentData): Quiz {
  return {
    _id: id,
    title: data.title || "",
    description: data.description || "",
    date: typeof data.date === "string" ? data.date : tsToIso(data.date),
    registrationLink: data.registrationLink || "",
    createdByEmail: data.createdByEmail || "",
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export async function listQuizzes(opts: {
  scope?: "all" | "upcoming";
  limit?: number;
}): Promise<Quiz[]> {
  const db = adminDb();
  const limit = opts.limit ?? 100;

  if (opts.scope === "all") {
    const snap = await db
      .collection("quizzes")
      .orderBy("date", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => docToQuiz(d.id, d.data()));
  }

  // Upcoming = date >= now. Stored as ISO string so lexical compare works.
  const nowIso = new Date().toISOString();
  const snap = await db
    .collection("quizzes")
    .where("date", ">=", nowIso)
    .orderBy("date", "asc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => docToQuiz(d.id, d.data()));
}

export async function createQuiz(input: QuizInput): Promise<Quiz> {
  const db = adminDb();
  const title = input.title.trim();
  if (!title) throw new Error("title is required");
  if (!input.date) throw new Error("date is required");

  const parsed = new Date(input.date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("date must be a valid ISO date string");
  }

  const ref = db.collection("quizzes").doc();
  await ref.set({
    title,
    description: typeof input.description === "string" ? input.description.trim() : "",
    date: parsed.toISOString(),
    registrationLink:
      typeof input.registrationLink === "string"
        ? input.registrationLink.trim()
        : "",
    createdByEmail: input.createdByEmail.toLowerCase(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const fresh = await ref.get();
  return docToQuiz(ref.id, fresh.data() as FirebaseFirestore.DocumentData);
}

export async function deleteQuiz(id: string): Promise<boolean> {
  const db = adminDb();
  const ref = db.collection("quizzes").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}
