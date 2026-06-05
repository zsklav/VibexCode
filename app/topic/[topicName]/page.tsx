// app/topic/[topicName]/page.tsx
//
// Lists real problems whose `tags` array contains the URL-decoded topic name.
// Previously read from a `Categories` Mongo collection that nothing ever
// wrote to, so the page always 404'd. Now sources data from Questions
// directly — the same collection /problems and /playground use.

import { notFound } from "next/navigation";
import { db } from "@/lib/firebase-admin";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import Navbar from "@/app/components/Navbar";

interface TopicPageProps {
  params: Promise<{
    topicName: string;
  }>;
}

type LeanQuestion = {
  id: string;
  title?: string;
  difficulty?: "easy" | "medium" | "hard";
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-600/80",
  medium: "bg-yellow-600/80",
  hard: "bg-red-600/80",
};

export default async function TopicPage({ params }: TopicPageProps) {
  const { topicName: raw } = await params;
  const topicName = decodeURIComponent(raw);

  const normalizedTag = topicName.trim().toLowerCase();
  const snapshot = await db
    .collection("questions")
    .where("tagsLower", "array-contains", normalizedTag)
    .get();

  const questions: LeanQuestion[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || "",
      difficulty: data.difficulty,
    };
  });

  if (questions.length === 0) return notFound();

  return (
    <div className="min-h-screen p-6 text-gray-900 dark:text-white">
      <Navbar />
      <div className="w-full">
        <h1 className="text-3xl font-bold mb-2 capitalize">{topicName}</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {questions.length} problem{questions.length === 1 ? "" : "s"}
        </p>

        <div className="space-y-2">
          {questions.map((q, i) => (
            <a
              key={q.id}
              href={`/playground?id=${q.id}`}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-xl shadow hover:opacity-90 transition"
            >
              <span className="text-white text-sm">
                {i + 1}. {q.title || "Untitled"}
              </span>
              {q.difficulty && (
                <span
                  className={`px-2 py-0.5 rounded text-xs text-white ${
                    DIFFICULTY_COLORS[q.difficulty] || "bg-gray-500"
                  }`}
                >
                  {q.difficulty}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
