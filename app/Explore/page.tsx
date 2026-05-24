"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Trophy,
  Target,
  ChevronLeft,
  ChevronRight,
  Search,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Lead from "../components/Lead";
import TagCard from "../components/TagCard";
import type { RootState } from "../store/store";

interface Question {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  difficulty?: "easy" | "medium" | "hard";
  [key: string]: unknown;
}

interface Submission {
  _id: string;
  questionId: string;
  questionTitle?: string;
  difficulty?: "easy" | "medium" | "hard";
  passed?: boolean;
  points?: number;
  runtimeMs?: number;
  language?: string;
  submittedAt?: string;
}

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  date: string;
  registrationLink?: string;
}

const DIFFICULTY_BADGE: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function formatQuizDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ExplorePage() {
  const { userData, status: isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );

  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
    fetch("/api/questions")
      .then((r) => r.json())
      .then((d: { questions?: Question[] }) => setQuestions(d.questions || []))
      .catch(() => setQuestions([]));
  }, []);

  useEffect(() => {
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then((d: { quizzes?: Quiz[] }) => setQuizzes(d.quizzes || []))
      .catch(() => setQuizzes([]));
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !userData?.email) {
      setSubmissions([]);
      return;
    }
    fetch(
      `/api/user-submissions?userEmail=${encodeURIComponent(userData.email)}`
    )
      .then((r) => r.json())
      .then((d: { submissions?: Submission[] }) =>
        setSubmissions(d.submissions || [])
      )
      .catch(() => setSubmissions([]));
  }, [isLoggedIn, userData?.email]);

  // Topics grouping.
  const grouped: Record<string, Question[]> = {};
  questions.forEach((q) => {
    if (!q.tags || q.tags.length === 0) {
      grouped["Untagged"] = [...(grouped["Untagged"] || []), q];
    } else {
      q.tags.forEach((tag) => {
        grouped[tag] = [...(grouped[tag] || []), q];
      });
    }
  });

  // Recent Tests: dedupe by question — newest first.
  const seenQuestionIds = new Set<string>();
  const recentTests: Submission[] = [];
  for (const sub of submissions) {
    const key = sub.questionId || sub.questionTitle || sub._id;
    if (seenQuestionIds.has(key)) continue;
    seenQuestionIds.add(key);
    recentTests.push(sub);
    if (recentTests.length >= 5) break;
  }

  // Stats are activity-quality measures, not unique counts.
  const totalSubmissions = submissions.length;
  const passedSubmissions = submissions.filter((s) => s.passed).length;
  const uniqueSolved = new Set(
    submissions.filter((s) => s.passed).map((s) => s.questionId)
  ).size;
  const accuracyPct =
    totalSubmissions > 0
      ? Math.round((passedSubmissions / totalSubmissions) * 100)
      : 0;
  const totalPoints = submissions.reduce((sum, s) => sum + (s.points || 0), 0);

  const scrollLeft = () =>
    scrollRef.current?.scrollBy({ left: -320, behavior: "smooth" });
  const scrollRight = () =>
    scrollRef.current?.scrollBy({ left: 320, behavior: "smooth" });

  const displayName =
    isLoggedIn && userData?.name ? userData.name : "Welcome";

  const filteredTopics = Object.entries(grouped).filter(([tag]) =>
    search.trim()
      ? tag.toLowerCase().includes(search.trim().toLowerCase())
      : true
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-gray-800 dark:bg-[#020612] dark:text-white transition-all">
        <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-10">
          {/* Header */}
          <div data-aos="fade-down">
            <h2 className="text-3xl md:text-4xl font-bold">
              {isLoggedIn ? `Welcome, ${displayName}!` : "Welcome!"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isLoggedIn
                ? "Here's a snapshot of your activity."
                : "Log in to see your personal dashboard."}
            </p>
          </div>

          {/* Stats strip — 4 small cards instead of 2 big ones */}
          {isLoggedIn && (
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
              data-aos="fade-up"
            >
              <StatPill
                icon={TrendingUp}
                label="Submissions"
                value={totalSubmissions}
              />
              <StatPill
                icon={Target}
                label="Pass rate"
                value={totalSubmissions ? `${accuracyPct}%` : "—"}
              />
              <StatPill icon={Trophy} label="Solved" value={uniqueSolved} />
              <StatPill icon={Trophy} label="Points" value={totalPoints} />
            </div>
          )}

          {/* Main two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Left column: Recent Tests + Quizzes */}
            <div className="lg:col-span-2 space-y-8">
              {/* Recent Tests — list, not grid (works for 1 or 5 items) */}
              <section data-aos="fade-up">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold">Recent Tests</h3>
                  {isLoggedIn && submissions.length > 5 && (
                    <Link
                      href="/submissions"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View all <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {!isLoggedIn ? (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 text-center text-gray-500 dark:text-gray-400 shadow-[0_4px_20px_rgba(128,0,255,0.08)]">
                    Log in to see your recent submissions.
                  </div>
                ) : recentTests.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 text-center shadow-[0_4px_20px_rgba(128,0,255,0.08)]">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      No submissions yet.
                    </p>
                    <Link
                      href="/problems"
                      className="text-blue-600 hover:underline"
                    >
                      Solve your first problem →
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-[0_4px_20px_rgba(128,0,255,0.08)] overflow-hidden">
                    {recentTests.map((s, i) => (
                      <Link
                        key={s._id}
                        href={`/playground?id=${s.questionId}`}
                        className={`flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition ${
                          i !== recentTests.length - 1
                            ? "border-b border-gray-100 dark:border-zinc-700"
                            : ""
                        }`}
                      >
                        {s.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium truncate">
                              {s.questionTitle || "Untitled"}
                            </h4>
                            {s.difficulty && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
                                  DIFFICULTY_BADGE[s.difficulty] ||
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {s.difficulty}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {s.runtimeMs !== undefined && `${s.runtimeMs}ms · `}
                            {s.language || "—"}
                          </p>
                        </div>
                        <span className="text-sm text-purple-600 dark:text-purple-300 font-medium shrink-0">
                          {s.points || 0} pts
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Upcoming Quizzes — only renders if there are quizzes,
                  otherwise a small inline banner (no big empty box) */}
              <section data-aos="fade-up">
                <h3 className="text-xl font-semibold mb-3">
                  Upcoming Quizzes
                </h3>
                {quizzes.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-zinc-900 border border-dashed border-gray-200 dark:border-zinc-700 rounded-xl p-4 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <CalendarDays className="w-5 h-5 shrink-0" />
                    No upcoming quizzes — check back soon.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quizzes.map((q, i) => (
                      <div
                        key={q._id}
                        className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-[0_4px_20px_rgba(128,0,255,0.12)] transition hover:scale-[1.02] hover:shadow-[0_6px_30px_rgba(128,0,255,0.25)]"
                        data-aos="fade-up"
                        data-aos-delay={i * 100}
                      >
                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                          <CalendarDays className="w-4 h-4" />
                          <span className="text-xs font-medium">
                            {formatQuizDate(q.date)}
                          </span>
                        </div>
                        <h4 className="font-semibold mb-3">{q.title}</h4>
                        {q.registrationLink ? (
                          <a
                            href={q.registrationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-1.5 rounded-full transition"
                          >
                            Register
                          </a>
                        ) : (
                          <span className="inline-block text-xs text-gray-400">
                            Details soon
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right column: Leaderboard — top-aligned, no more mt-16 hack */}
            <aside className="space-y-6">
              <Lead />
            </aside>
          </div>

          {/* Topics with inline search + arrows */}
          <section data-aos="fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="text-2xl font-bold">Topics</h3>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search topics..."
                    className="w-full pl-10 pr-3 py-2 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
                <button
                  onClick={scrollLeft}
                  className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700 transition"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={scrollRight}
                  className="p-2 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700 transition"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {filteredTopics.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {search ? `No topics match "${search}".` : "No topics yet."}
              </p>
            ) : (
              <div
                ref={scrollRef}
                className="flex space-x-6 overflow-x-auto scroll-smooth pb-2"
              >
                {filteredTopics.map(([tag, qs]) => (
                  <TagCard key={tag} tag={tag} questions={qs} />
                ))}
              </div>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}

const StatPill = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
}) => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-[0_4px_20px_rgba(128,0,255,0.08)] flex items-center gap-3">
    <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {label}
      </p>
      <p className="text-xl font-bold leading-tight">{value}</p>
    </div>
  </div>
);
