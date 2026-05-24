"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Plus, Trash2, ArrowLeft, ExternalLink } from "lucide-react";
import Navbar from "../../components/Navbar";
import { isAdminEmail } from "@/lib/auth";
import type { RootState } from "../../store/store";

interface Quiz {
  _id: string;
  title: string;
  description: string;
  date: string;
  registrationLink: string;
  createdByEmail: string;
}

const AdminQuizzesList = () => {
  const { userData } = useSelector((state: RootState) => state.auth);
  const email = userData?.email || null;
  const isAdmin = isAdminEmail(email);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetch("/api/quizzes?scope=all")
      .then((r) => r.json())
      .then((d) => setQuizzes(Array.isArray(d?.quizzes) ? d.quizzes : []))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleDelete = async (id: string) => {
    if (!email) return;
    if (!confirm("Delete this quiz permanently?")) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/quizzes/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: email }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setQuizzes((prev) => prev.filter((q) => q._id !== id));
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
          <h1 className="text-2xl font-bold">Admins only</h1>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Admin home
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Quizzes</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {quizzes.length} total
            </p>
          </div>
          <Link
            href="/admin/quizzes/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            Schedule quiz
          </Link>
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading...</p>
        ) : quizzes.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-12 text-center shadow">
            <p className="text-gray-500">No quizzes scheduled.</p>
            <Link
              href="/admin/quizzes/new"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Schedule the first one →
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow overflow-hidden">
            {quizzes.map((q, i) => {
              const date = new Date(q.date);
              const isPast = date.getTime() < Date.now();
              return (
                <div
                  key={q._id}
                  className={`flex items-start justify-between gap-4 p-5 ${
                    i !== quizzes.length - 1
                      ? "border-b border-gray-100 dark:border-zinc-700"
                      : ""
                  } ${isPast ? "opacity-60" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{q.title}</span>
                      {isPast && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-700 text-gray-600">
                          past
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {date.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {q.description && (
                      <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                        {q.description}
                      </p>
                    )}
                    {q.registrationLink && (
                      <a
                        href={q.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Registration link
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(q._id)}
                    disabled={deleting === q._id}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50 shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminQuizzesList;
