"use client";
import React, { useState } from "react";

export type Question = {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  testcases?: string;
  solutions?: string;
  difficulty?: "easy" | "medium" | "hard";
  createdAt?: string;
  updatedAt?: string;
};

type TagCardProps = {
  tag: string;
  questions: Question[];
  onTagClick?: (tag: string) => void;
  onDifficultyClick?: (difficulty: string) => void;
};

export default function TagCard({
  tag,
  questions,
  onTagClick,
  onDifficultyClick,
}: TagCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const difficultyClasses = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <>
      {/* Card */}
      <div
        className="min-w-[400px] max-w-xs vibe-card vibe-glow p-5 cursor-pointer hover:scale-[1.03] transition-transform"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex flex-col h-full justify-between gap-4">
          {/* Title & Count */}
          <div>
            <h2 className="text-xl font-semibold capitalize text-zinc-900 dark:text-white">
              {tag}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {questions.length} Question{questions.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Progress Circle */}
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <svg
                className="w-16 h-16 transform -rotate-90"
                viewBox="0 0 64 64"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-zinc-300/60 dark:text-white/25"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * 0.7}`} // 30% progress
                  className="text-zinc-900 dark:text-white"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">30%</span>
              </div>
            </div>
          </div>

          {/* Hint Text */}
          <div className="text-center">
            <p className="text-zinc-600 dark:text-zinc-300 text-sm">
              Click to view questions
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="vibe-panel max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-zinc-200/50 dark:border-white/10">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{tag}</h2>
                <p className="text-zinc-600 dark:text-zinc-300">
                  {questions.length} Question{questions.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="vibe-button-secondary rounded-full p-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              {questions.map((q, index) => {
                const isExpanded = expanded === q._id;
                const shouldShowExpand = (q.description?.length ?? 0) > 200;

                return (
                  <div
                    key={q._id}
                    className="vibe-card p-5"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="vibe-chip text-gray-700 dark:text-gray-300 text-sm font-medium">
                        #{index + 1}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded font-bold uppercase cursor-pointer ${difficultyClasses(
                          q.difficulty
                        )}`}
                        onClick={() => onDifficultyClick?.(q.difficulty || "")}
                        title={`Filter by ${q.difficulty} difficulty`}
                      >
                        {q.difficulty || "easy"}
                      </span>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-300">
                          {q.title}
                        </h3>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-gray-700 dark:text-gray-300">
                        {shouldShowExpand && !isExpanded
                          ? q.description.slice(0, 200) + "..."
                          : q.description}
                      </p>
                      {shouldShowExpand && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : q._id)}
                          className="text-blue-600 dark:text-blue-300 hover:underline text-sm mt-2 font-medium"
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {q.tags?.map((t, idx) => (
                          <button
                            key={t + idx}
                            className="vibe-chip text-blue-800 dark:text-blue-200"
                            onClick={() => onTagClick?.(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <a
                        href={`/playground?id=${q._id}`}
                        className="vibe-button px-4 py-2 font-semibold"
                      >
                        Solve
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
