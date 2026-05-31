// Firestore-backed submissions + leaderboard maintenance.
//
// Collection: submissions/{autoId}.
//
// On a passed submission, also bumps the denormalized leaderboard/{email}
// document the UI reads from (Lead / Leaderboards components). Both writes
// are atomic via runTransaction.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type Difficulty = "easy" | "medium" | "hard";

const POINTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
};

export function pointsFor(
  difficulty: string | undefined,
  passed: boolean | undefined
): number {
  if (!passed) return 0;
  if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") {
    return POINTS_BY_DIFFICULTY[difficulty];
  }
  return POINTS_BY_DIFFICULTY.easy;
}

export type SubmissionInput = {
  userEmail: string;
  userName?: string;
  questionId: string;
  questionTitle?: string;
  answerMarkdown: string;
  submittedAt?: string;
  passed?: boolean;
  code?: string;
  language?: string;
  difficulty?: string;
  runtimeMs?: number;
  memoryKb?: number;
};

export type SubmissionRecord = {
  _id: string;
  userEmail: string;
  userName?: string;
  questionId: string;
  questionTitle?: string;
  answerMarkdown: string;
  submittedAt: string;
  passed: boolean;
  code?: string;
  language?: string;
  difficulty?: string;
  runtimeMs?: number;
  memoryKb?: number;
  points: number;
};

function tsToIso(ts: Timestamp | string | undefined): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === "string") return ts;
  return ts.toDate ? ts.toDate().toISOString() : new Date().toISOString();
}

function docToSubmission(
  id: string,
  data: FirebaseFirestore.DocumentData
): SubmissionRecord {
  return {
    _id: id,
    userEmail: data.userEmail || "",
    userName: data.userName,
    questionId: data.questionId || "",
    questionTitle: data.questionTitle,
    answerMarkdown: data.answerMarkdown || "",
    submittedAt: tsToIso(data.submittedAt),
    passed: Boolean(data.passed),
    code: data.code,
    language: data.language,
    difficulty: data.difficulty,
    runtimeMs: data.runtimeMs,
    memoryKb: data.memoryKb,
    points: typeof data.points === "number" ? data.points : 0,
  };
}

export async function createSubmission(
  input: SubmissionInput
): Promise<{ submission: SubmissionRecord; points: number }> {
  const db = adminDb();
  const userEmail = input.userEmail.trim().toLowerCase();
  const passed = Boolean(input.passed);
  const points = pointsFor(input.difficulty, passed);
  const submittedAt = input.submittedAt
    ? new Date(input.submittedAt).toISOString()
    : new Date().toISOString();

  const subRef = db.collection("submissions").doc();
  const lbRef = db.collection("leaderboard").doc(userEmail);

  // Read leaderboard inside transaction so we can decide whether the
  // question is already-credited (no double-counting on resubmits).
  await db.runTransaction(async (tx) => {
    const lbSnap = await tx.get(lbRef);
    const alreadyCredited =
      lbSnap.exists &&
      Array.isArray(lbSnap.data()?.solvedQuestionIds) &&
      (lbSnap.data()!.solvedQuestionIds as string[]).includes(input.questionId);

    const subData = {
      userEmail,
      userName: input.userName || "",
      questionId: input.questionId,
      questionTitle: input.questionTitle || "",
      answerMarkdown: input.answerMarkdown,
      submittedAt,
      passed,
      code: input.code || "",
      language: input.language || "",
      difficulty: input.difficulty || "",
      runtimeMs:
        typeof input.runtimeMs === "number" && Number.isFinite(input.runtimeMs)
          ? input.runtimeMs
          : null,
      memoryKb:
        typeof input.memoryKb === "number" && Number.isFinite(input.memoryKb)
          ? input.memoryKb
          : null,
      points,
      createdAt: FieldValue.serverTimestamp(),
    };
    tx.set(subRef, subData);

    if (passed && points > 0 && !alreadyCredited) {
      // Bump leaderboard (creates the doc on first credit).
      const lbUpdate: { [k: string]: unknown } = {
        email: userEmail,
        name: input.userName || userEmail.split("@")[0],
        points: FieldValue.increment(points),
        solvedQuestionIds: FieldValue.arrayUnion(input.questionId),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (lbSnap.exists) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tx.update(lbRef, lbUpdate as any);
      } else {
        tx.set(lbRef, lbUpdate);
      }
    }
  });

  const fresh = await subRef.get();
  return {
    submission: docToSubmission(subRef.id, fresh.data() as FirebaseFirestore.DocumentData),
    points,
  };
}

export async function listUserSubmissions(
  userEmail: string
): Promise<SubmissionRecord[]> {
  const db = adminDb();
  const email = userEmail.trim().toLowerCase();
  const snap = await db
    .collection("submissions")
    .where("userEmail", "==", email)
    .orderBy("submittedAt", "desc")
    .limit(200)
    .get();
  return snap.docs.map((d) => docToSubmission(d.id, d.data()));
}
