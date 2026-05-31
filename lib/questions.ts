// Firestore-backed questions + topics maintenance.
//
// Schema:
//   questions/{autoId} = {
//     title, description, testcases, solutions,
//     tags: string[],           — original-case for display
//     tagsLower: string[],      — lowercased for case-insensitive query
//     difficulty: "easy"|"medium"|"hard",
//     createdAt, updatedAt
//   }
//   topics/{tag} = { count: number }     — tag is stored lowercased
//
// Topic counts are maintained transactionally on create/update/delete.
// Replaces the Mongo $unwind / $group aggregation.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type Difficulty = "easy" | "medium" | "hard";

export type QuestionInput = {
  title: string;
  description: string;
  testcases?: string;
  solutions?: string;
  tags?: string[];
  difficulty?: Difficulty;
};

export type Question = {
  _id: string;
  title: string;
  description: string;
  testcases: string;
  solutions: string;
  tags: string[];
  difficulty: Difficulty;
  createdAt: string;
  updatedAt: string;
};

function normalizeTags(tags: unknown): { tags: string[]; tagsLower: string[] } {
  if (!Array.isArray(tags)) return { tags: [], tagsLower: [] };
  const cleaned = tags
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return {
    tags: cleaned,
    tagsLower: cleaned.map((t) => t.toLowerCase()),
  };
}

function tsToIso(ts: Timestamp | undefined): string {
  return ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
}

function docToQuestion(id: string, data: FirebaseFirestore.DocumentData): Question {
  return {
    _id: id,
    title: data.title || "",
    description: data.description || "",
    testcases: data.testcases || "",
    solutions: data.solutions || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    difficulty:
      data.difficulty === "easy" ||
      data.difficulty === "medium" ||
      data.difficulty === "hard"
        ? data.difficulty
        : "easy",
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export async function listQuestions(limit = 0): Promise<Question[]> {
  const db = adminDb();
  let query = db.collection("questions").orderBy("createdAt", "desc");
  if (limit > 0) query = query.limit(limit);
  const snap = await query.get();
  return snap.docs.map((d) => docToQuestion(d.id, d.data()));
}

export async function getQuestion(id: string): Promise<Question | null> {
  const db = adminDb();
  const snap = await db.collection("questions").doc(id).get();
  if (!snap.exists) return null;
  return docToQuestion(snap.id, snap.data() as FirebaseFirestore.DocumentData);
}

export async function createQuestion(input: QuestionInput): Promise<Question> {
  const db = adminDb();
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) throw new Error("Title is required");
  if (!description) throw new Error("Description is required");

  const difficulty: Difficulty =
    input.difficulty && ["easy", "medium", "hard"].includes(input.difficulty)
      ? input.difficulty
      : "easy";

  const { tags, tagsLower } = normalizeTags(input.tags);

  const ref = db.collection("questions").doc();
  await db.runTransaction(async (tx) => {
    // Read all topic refs first (Firestore transaction rule: reads before writes).
    const topicRefs = tagsLower.map((t) => db.collection("topics").doc(t));
    const topicSnaps = await Promise.all(topicRefs.map((r) => tx.get(r)));

    tx.set(ref, {
      title,
      description,
      testcases: typeof input.testcases === "string" ? input.testcases.trim() : "",
      solutions: typeof input.solutions === "string" ? input.solutions.trim() : "",
      tags,
      tagsLower,
      difficulty,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    topicRefs.forEach((r, i) => {
      if (topicSnaps[i].exists) {
        tx.update(r, { count: FieldValue.increment(1) });
      } else {
        tx.set(r, { count: 1 });
      }
    });
  });

  const fresh = await ref.get();
  return docToQuestion(ref.id, fresh.data() as FirebaseFirestore.DocumentData);
}

export async function updateQuestion(
  id: string,
  patch: Partial<QuestionInput>
): Promise<Question | null> {
  const db = adminDb();
  const ref = db.collection("questions").doc(id);

  // Validate difficulty if provided.
  if (
    patch.difficulty !== undefined &&
    !["easy", "medium", "hard"].includes(patch.difficulty)
  ) {
    throw new Error("Difficulty must be easy, medium, or hard");
  }

  const updated = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const prev = snap.data() as FirebaseFirestore.DocumentData;

    const update: { [k: string]: unknown } = {};
    if (typeof patch.title === "string") update.title = patch.title.trim();
    if (typeof patch.description === "string")
      update.description = patch.description.trim();
    if (typeof patch.testcases === "string")
      update.testcases = patch.testcases.trim();
    if (typeof patch.solutions === "string")
      update.solutions = patch.solutions.trim();
    if (patch.difficulty) update.difficulty = patch.difficulty;

    let tagDiff: { added: string[]; removed: string[] } | null = null;
    if (patch.tags !== undefined) {
      const { tags, tagsLower } = normalizeTags(patch.tags);
      update.tags = tags;
      update.tagsLower = tagsLower;
      const prevLower: string[] = Array.isArray(prev.tagsLower) ? prev.tagsLower : [];
      const added = tagsLower.filter((t) => !prevLower.includes(t));
      const removed = prevLower.filter((t) => !tagsLower.includes(t));
      tagDiff = { added, removed };
    }

    // Read topic docs we need to bump.
    const refs = tagDiff
      ? [...tagDiff.added, ...tagDiff.removed].map((t) =>
          db.collection("topics").doc(t)
        )
      : [];
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const snapByPath = new Map(snaps.map((s, i) => [refs[i].path, s]));

    update.updatedAt = FieldValue.serverTimestamp();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx.update(ref, update as any);

    if (tagDiff) {
      for (const t of tagDiff.added) {
        const r = db.collection("topics").doc(t);
        const s = snapByPath.get(r.path);
        if (s?.exists) tx.update(r, { count: FieldValue.increment(1) });
        else tx.set(r, { count: 1 });
      }
      for (const t of tagDiff.removed) {
        const r = db.collection("topics").doc(t);
        tx.update(r, { count: FieldValue.increment(-1) });
      }
    }

    return { ...prev, ...update };
  });

  if (!updated) return null;
  const fresh = await ref.get();
  return docToQuestion(ref.id, fresh.data() as FirebaseFirestore.DocumentData);
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const db = adminDb();
  const ref = db.collection("questions").doc(id);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const prev = snap.data() as FirebaseFirestore.DocumentData;
    const prevLower: string[] = Array.isArray(prev.tagsLower) ? prev.tagsLower : [];

    tx.delete(ref);
    for (const t of prevLower) {
      tx.update(db.collection("topics").doc(t), {
        count: FieldValue.increment(-1),
      });
    }
    return true;
  });
}

export async function listTopics(): Promise<{ name: string; count: number }[]> {
  const db = adminDb();
  // Sort by count desc, exclude zero-count topics (orphans after deletes).
  const snap = await db
    .collection("topics")
    .where("count", ">", 0)
    .orderBy("count", "desc")
    .get();
  return snap.docs.map((d) => ({
    name: d.id,
    count: (d.data().count as number) || 0,
  }));
}

export async function findQuestionsByTag(tag: string): Promise<Question[]> {
  const db = adminDb();
  const snap = await db
    .collection("questions")
    .where("tagsLower", "array-contains", tag.trim().toLowerCase())
    .get();
  return snap.docs.map((d) => docToQuestion(d.id, d.data()));
}
