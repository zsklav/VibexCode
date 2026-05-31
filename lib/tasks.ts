// Firestore-backed personal tasks. Owned by userId (Firebase UID).
// Collection: tasks/{autoId}.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type TaskPriority = "low" | "medium" | "high";

export type TaskRecord = {
  _id: string;
  text: string;
  completed: boolean;
  priority: TaskPriority;
  createdAt: string;
  userId: string;
};

function tsToIso(ts: Timestamp | undefined): string {
  return ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
}

function docToTask(id: string, data: FirebaseFirestore.DocumentData): TaskRecord {
  return {
    _id: id,
    text: data.text || "",
    completed: Boolean(data.completed),
    priority:
      data.priority === "low" || data.priority === "high"
        ? data.priority
        : "medium",
    createdAt: tsToIso(data.createdAt),
    userId: data.userId || "",
  };
}

export async function listUserTasks(userId: string): Promise<TaskRecord[]> {
  const db = adminDb();
  const snap = await db
    .collection("tasks")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return snap.docs.map((d) => docToTask(d.id, d.data()));
}

export async function createTask(input: {
  text: string;
  priority: TaskPriority;
  userId: string;
}): Promise<TaskRecord> {
  const db = adminDb();
  if (!input.text.trim()) throw new Error("text is required");
  if (!input.userId) throw new Error("userId is required");

  const ref = db.collection("tasks").doc();
  await ref.set({
    text: input.text.trim(),
    completed: false,
    priority: input.priority || "medium",
    userId: input.userId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const fresh = await ref.get();
  return docToTask(ref.id, fresh.data() as FirebaseFirestore.DocumentData);
}

export async function updateTask(
  id: string,
  userId: string,
  patch: { completed?: boolean }
): Promise<TaskRecord | null> {
  const db = adminDb();
  const ref = db.collection("tasks").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as FirebaseFirestore.DocumentData;
  if (data.userId !== userId) return null;

  const update: { [k: string]: unknown } = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof patch.completed === "boolean") update.completed = patch.completed;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await ref.update(update as any);

  const fresh = await ref.get();
  return docToTask(ref.id, fresh.data() as FirebaseFirestore.DocumentData);
}

export async function deleteTask(id: string, userId: string): Promise<boolean> {
  const db = adminDb();
  const ref = db.collection("tasks").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  if ((snap.data() as FirebaseFirestore.DocumentData).userId !== userId)
    return false;
  await ref.delete();
  return true;
}
