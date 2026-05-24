// app/topic/[topicName]/page.tsx
//
// Lists real problems whose `tags` array contains the URL-decoded topic name.
// Previously read from a `Categories` Mongo collection that nothing ever
// wrote to, so the page always 404'd. Now sources data from Questions
// directly — the same collection /problems and /playground use.

import connectDB from "@/lib/mongodb";
import { notFound } from "next/navigation";
import Questions from "@/models/Questions";

interface TopicPageProps {
  params: Promise<{
    topicName: string;
  }>;
}

type LeanQuestion = {
  _id: { toString: () => string };
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

  await connectDB();

  // Case-insensitive tag match so "arrays" and "Arrays" both work.
  const escaped = topicName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const questions = await Questions.find({
    tags: { $regex: new RegExp(`^${escaped}$`, "i") },
  })
    .select("_id title difficulty")
    .lean<LeanQuestion[]>();

  if (questions.length === 0) return notFound();

  return (
    <div className="min-h-screen p-6 dark:bg-[#020612] text-gray-900 dark:text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 capitalize">{topicName}</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {questions.length} problem{questions.length === 1 ? "" : "s"}
        </p>

        <div className="space-y-2">
          {questions.map((q, i) => (
            <a
              key={q._id.toString()}
              href={`/playground?id=${q._id.toString()}`}
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
