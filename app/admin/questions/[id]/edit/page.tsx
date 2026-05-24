"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import Navbar from "../../../../components/Navbar";
import { isAdminEmail } from "@/lib/auth";
import type { RootState } from "../../../../store/store";

interface QuestionForm {
  title: string;
  description: string;
  testcases: string;
  solutions: string;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
}

const EMPTY: QuestionForm = {
  title: "",
  description: "",
  testcases: "",
  solutions: "",
  tags: [],
  difficulty: "easy",
};

const EditQuestionPage = ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = use(params);
  const router = useRouter();
  const { userData } = useSelector((state: RootState) => state.auth);
  const email = userData?.email || null;
  const isAdmin = isAdminEmail(email);

  const [form, setForm] = useState<QuestionForm>(EMPTY);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetch(`/api/questions/${id}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data?.success) return;
        const q = data.question;
        setForm({
          title: q.title || "",
          description: q.description || "",
          testcases: q.testcases || "",
          solutions: q.solutions || "",
          tags: Array.isArray(q.tags) ? q.tags : [],
          difficulty: q.difficulty || "easy",
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [id, isAdmin]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    setForm((f) =>
      f.tags.includes(t) ? f : { ...f, tags: [...f.tags, t] }
    );
    setTagInput("");
  };

  const removeTag = (t: string) =>
    setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const save = async () => {
    if (!email) return;
    setSaving(true);
    setError("");
    try {
      // Flush typed-but-not-yet-added tag so the user doesn't lose it.
      const flushedTags = tagInput.trim()
        ? Array.from(new Set([...form.tags, tagInput.trim().toLowerCase()]))
        : form.tags;

      const res = await fetch(`/api/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: email,
          title: form.title,
          description: form.description,
          testcases: form.testcases,
          solutions: form.solutions,
          tags: flushedTags,
          difficulty: form.difficulty,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      router.push("/admin/questions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
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

  if (notFound) {
    return (
      <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-6xl mb-4">🤷</p>
          <h1 className="text-2xl font-bold mb-4">Question not found</h1>
          <Link href="/admin/questions" className="text-blue-600 hover:underline">
            ← Back to questions list
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to questions
        </Link>

        <h1 className="text-3xl font-bold mb-6">Edit Question</h1>

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading...</p>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6 space-y-5">
            <Field label="Title">
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={6}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
              />
            </Field>

            <Field label="Testcases">
              <textarea
                rows={4}
                value={form.testcases}
                onChange={(e) =>
                  setForm((f) => ({ ...f, testcases: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 font-mono text-sm"
              />
            </Field>

            <Field label="Reference solution">
              <textarea
                rows={6}
                value={form.solutions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, solutions: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 font-mono text-sm"
              />
            </Field>

            <Field label="Difficulty">
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    difficulty: e.target.value as QuestionForm["difficulty"],
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Field>

            <Field label="Tags">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="type and press space/enter"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
                />
                <button
                  onClick={addTag}
                  type="button"
                  className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600"
                >
                  Add
                </button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      {t}
                      <button
                        onClick={() => removeTag(t)}
                        type="button"
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save changes"}
              </button>
              <Link
                href="/admin/questions"
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    {children}
  </div>
);

export default EditQuestionPage;
