"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import Navbar from "../../../components/Navbar";
import { isAdminEmail } from "@/lib/auth";
import type { RootState } from "../../../store/store";

const NewQuizPage = () => {
  const router = useRouter();
  const { userData } = useSelector((state: RootState) => state.auth);
  const email = userData?.email || null;
  const isAdmin = isAdminEmail(email);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email) return;
    if (!title.trim() || !date) {
      setError("Title and date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: email,
          title,
          description,
          date: new Date(date).toISOString(),
          registrationLink,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      router.push("/admin/quizzes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create quiz");
    } finally {
      setSaving(false);
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
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/admin/quizzes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to quizzes
        </Link>

        <h1 className="text-3xl font-bold mb-6">Schedule a Quiz</h1>

        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly DSA Challenge"
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topic, format, length, prizes..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Date &amp; time *
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Registration link
            </label>
            <input
              type="url"
              value={registrationLink}
              onChange={(e) => setRegistrationLink(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium"
            >
              <CalendarPlus className="w-4 h-4" />
              {saving ? "Creating..." : "Create quiz"}
            </button>
            <Link
              href="/admin/quizzes"
              className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewQuizPage;
