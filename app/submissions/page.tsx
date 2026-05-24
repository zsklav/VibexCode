"use client";

import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { CheckCircle2, XCircle, Filter } from "lucide-react";
import Navbar from "../components/Navbar";
import type { RootState } from "../store/store";

interface Submission {
  _id: string;
  questionId: string;
  questionTitle?: string;
  passed: boolean;
  language?: string;
  difficulty?: "easy" | "medium" | "hard";
  runtimeMs?: number;
  memoryKb?: number;
  points?: number;
  submittedAt: string;
}

type Filter = "all" | "passed" | "failed";

const difficultyClass: Record<NonNullable<Submission["difficulty"]>, string> = {
  easy: "text-green-600",
  medium: "text-yellow-600",
  hard: "text-red-600",
};

const SubmissionsPage = () => {
  const { userData, status: isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );
  const email = userData?.email?.toLowerCase() || null;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!isLoggedIn || !email) {
      setLoading(false);
      return;
    }
    fetch(`/api/user-submissions?userEmail=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.submissions)) {
          setSubmissions(d.submissions);
        }
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, email]);

  const filtered = useMemo(() => {
    if (filter === "passed") return submissions.filter((s) => s.passed);
    if (filter === "failed") return submissions.filter((s) => !s.passed);
    return submissions;
  }, [submissions, filter]);

  const passRate = useMemo(() => {
    if (submissions.length === 0) return 0;
    return Math.round(
      (submissions.filter((s) => s.passed).length / submissions.length) * 100
    );
  }, [submissions]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold mb-2">Log in to view submissions</h1>
          <Link href="/login" className="text-blue-600 hover:underline">
            Go to login →
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Submissions</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {submissions.length} total · {passRate}% pass rate
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-4">
          <FilterPill
            label="All"
            active={filter === "all"}
            onClick={() => setFilter("all")}
            count={submissions.length}
          />
          <FilterPill
            label="Passed"
            active={filter === "passed"}
            onClick={() => setFilter("passed")}
            count={submissions.filter((s) => s.passed).length}
          />
          <FilterPill
            label="Failed"
            active={filter === "failed"}
            onClick={() => setFilter("failed")}
            count={submissions.filter((s) => !s.passed).length}
          />
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-12 text-center shadow">
            {submissions.length === 0 ? (
              <>
                <Filter className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">No submissions yet.</p>
                <Link
                  href="/problems"
                  className="text-blue-600 hover:underline"
                >
                  Try a problem →
                </Link>
              </>
            ) : (
              <p className="text-gray-500">No submissions match this filter.</p>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow overflow-hidden">
            {filtered.map((s, i) => (
              <div
                key={s._id}
                className={`flex items-center justify-between gap-4 p-4 ${
                  i !== filtered.length - 1
                    ? "border-b border-gray-100 dark:border-zinc-700"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {s.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/playground?id=${s.questionId}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {s.questionTitle || "(untitled problem)"}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {s.difficulty && (
                        <span
                          className={`font-medium ${
                            difficultyClass[s.difficulty]
                          }`}
                        >
                          {s.difficulty}
                        </span>
                      )}
                      {s.language && <span>· {s.language}</span>}
                      {typeof s.runtimeMs === "number" && (
                        <span>· {s.runtimeMs.toFixed(0)}ms</span>
                      )}
                      {typeof s.memoryKb === "number" && (
                        <span>· {(s.memoryKb / 1024).toFixed(1)}MB</span>
                      )}
                      {s.points ? (
                        <span className="text-purple-600 font-medium">
                          · +{s.points}pts
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(s.submittedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const FilterPill = ({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
      active
        ? "bg-blue-600 text-white"
        : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
    }`}
  >
    {label} <span className="opacity-70">({count})</span>
  </button>
);

export default SubmissionsPage;
