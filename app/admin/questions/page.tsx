"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Pencil, Trash2, Plus, ArrowLeft } from "lucide-react";
import Navbar from "../../components/Navbar";
import { isAdminEmail } from "@/lib/auth";
import type { RootState } from "../../store/store";

interface Question {
  _id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  updatedAt?: string;
}

const difficultyClass: Record<Question["difficulty"], string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const AdminQuestionsList = () => {
  const { userData } = useSelector((state: RootState) => state.auth);
  const email = userData?.email || null;
  const isAdmin = isAdminEmail(email);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetch("/api/questions")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.questions)) {
          setQuestions(d.questions);
        } else if (Array.isArray(d)) {
          setQuestions(d);
        } else {
          setQuestions([]);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleDelete = async (id: string) => {
    if (!email) return;
    if (
      !confirm(
        "Delete this question permanently? This cannot be undone."
      )
    )
      return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: email }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold mb-2">Admins only</h1>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Admin home
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Questions</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {questions.length} total
            </p>
          </div>
          <Link
            href="/admin/questions/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            New question
          </Link>
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-center py-12 text-red-500">{error}</p>
        ) : questions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-12 text-center shadow">
            <p className="text-gray-500">No questions yet.</p>
            <Link
              href="/admin/questions/new"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Create the first one →
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow overflow-hidden">
            {questions.map((q, i) => (
              <div
                key={q._id}
                className={`flex items-center justify-between gap-4 p-4 ${
                  i !== questions.length - 1
                    ? "border-b border-gray-100 dark:border-zinc-700"
                    : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{q.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        difficultyClass[q.difficulty]
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>
                  {q.tags?.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {q.tags.slice(0, 4).join(", ")}
                      {q.tags.length > 4 && ` +${q.tags.length - 4}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/admin/questions/${q._id}/edit`}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-blue-600"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(q._id)}
                    disabled={deleting === q._id}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminQuestionsList;
