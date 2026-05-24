"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import AOS from "aos";
import "aos/dist/aos.css";

import { BsFillBarChartFill } from "react-icons/bs";
import { FaClipboardList } from "react-icons/fa";
import { CgProfile } from "react-icons/cg";

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

  // Questions (for the Topics carousel).
  useEffect(() => {
    AOS.init({ duration: 800, once: true });
    fetch("/api/questions")
      .then((r) => r.json())
      .then((d: { questions?: Question[] }) => setQuestions(d.questions || []))
      .catch(() => setQuestions([]));
  }, []);

  // Upcoming quizzes.
  useEffect(() => {
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then((d: { quizzes?: Quiz[] }) => setQuizzes(d.quizzes || []))
      .catch(() => setQuizzes([]));
  }, []);

  // Current user's submissions (drives "Recent Tests" + Achievements).
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

  // Topics grouping (same logic as before).
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

  // Recent Tests: dedupe by question so a problem solved 3 times appears
  // once (latest attempt). /api/user-submissions returns newest-first, so the
  // first occurrence of each questionId is the latest.
  const seenQuestionIds = new Set<string>();
  const recentTests: Submission[] = [];
  for (const sub of submissions) {
    const key = sub.questionId || sub.questionTitle || sub._id;
    if (seenQuestionIds.has(key)) continue;
    seenQuestionIds.add(key);
    recentTests.push(sub);
    if (recentTests.length >= 4) break;
  }

  // Stats stay raw: "Submissions" = total attempts, "Pass rate" = passed /
  // total. These measure activity + attempt quality, not unique problems.
  const totalSubmissions = submissions.length;
  const passedSubmissions = submissions.filter((s) => s.passed).length;
  const accuracyPct =
    totalSubmissions > 0
      ? Math.round((passedSubmissions / totalSubmissions) * 100)
      : 0;

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  };
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  const displayName =
    isLoggedIn && userData?.name ? userData.name : "Welcome";

  return (
    <>
      <Navbar />
      <div className="min-h-screen text-gray-800 dark:bg-[#020612] dark:text-white transition-all">
        <main className="p-4 md:p-10">
          {/* Header */}
          <div
            className="flex flex-col md:flex-row justify-between items-start gap-4"
            data-aos="fade-down"
          >
            <div>
              <h2 className="text-3xl font-bold">
                {isLoggedIn ? `Welcome, ${displayName}!` : "Welcome!"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {isLoggedIn
                  ? "Here's a snapshot of your activity."
                  : "Log in to see your personal dashboard."}
              </p>
            </div>

            <div className="flex items-center space-x-4 w-full md:w-auto">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topics..."
                className="px-4 py-2 rounded-full border-2 border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none"
              />
              <CgProfile className="scale-150 text-gray-700 dark:text-white" />
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Recent Tests */}
              <section data-aos="fade-up">
                <h3 className="text-xl font-semibold mb-4">Recent Tests</h3>
                {!isLoggedIn ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    Log in to see your recent submissions.
                  </p>
                ) : recentTests.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 text-center text-gray-500 dark:text-gray-400 shadow-[0_4px_20px_rgba(128,0,255,0.15)]">
                    No submissions yet. Head to{" "}
                    <a
                      href="/problems"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Problems
                    </a>{" "}
                    and solve one.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recentTests.map((s, i) => (
                      <div
                        key={s._id}
                        className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-[0_4px_20px_rgba(128,0,255,0.15)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_6px_30px_rgba(128,0,255,0.3)]"
                        data-aos="fade-up"
                        data-aos-delay={i * 100}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold truncate">
                            {s.questionTitle || "Untitled"}
                          </h4>
                          {s.difficulty && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded uppercase font-medium ${
                                DIFFICULTY_BADGE[s.difficulty] ||
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {s.difficulty}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span
                            className={`font-medium ${
                              s.passed
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-500 dark:text-red-400"
                            }`}
                          >
                            {s.passed ? "✓ Passed" : "✗ Failed"}
                          </span>
                          <span className="text-purple-600 dark:text-purple-300 font-medium">
                            {s.points || 0} pts
                          </span>
                        </div>
                        {s.runtimeMs !== undefined && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {s.runtimeMs} ms · {s.language || "Unknown"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Upcoming Quizzes (real data from Mongo) */}
              <section data-aos="fade-up">
                <h3 className="text-xl font-semibold mb-4">
                  Upcoming Quizzes
                </h3>
                {quizzes.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 text-center text-gray-500 dark:text-gray-400 shadow-[0_4px_20px_rgba(128,0,255,0.15)]">
                    No upcoming quizzes — check back soon.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {quizzes.map((q, i) => (
                      <div
                        key={q._id}
                        className="bg-white dark:bg-zinc-800 rounded-xl p-6 text-center shadow-[0_4px_20px_rgba(128,0,255,0.25)] transition duration-300 hover:scale-[1.03] hover:shadow-[0_6px_30px_rgba(128,0,255,0.45)]"
                        data-aos="flip-up"
                        data-aos-delay={i * 150}
                      >
                        <h4 className="text-md font-medium">{q.title}</h4>
                        <div className="text-4xl mt-4 mb-2">📅</div>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">
                          {formatQuizDate(q.date)}
                        </p>
                        {q.registrationLink ? (
                          <a
                            href={q.registrationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full transition"
                          >
                            Register
                          </a>
                        ) : (
                          <button
                            disabled
                            className="bg-gray-300 dark:bg-zinc-600 text-gray-600 dark:text-gray-300 px-6 py-2 rounded-full cursor-not-allowed"
                          >
                            Details soon
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Achievements — real stats per user */}
              <section
                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                data-aos="fade-up"
              >
                <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-[0_4px_20px_rgba(128,0,255,0.25)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_6px_30px_rgba(128,0,255,0.4)]">
                  <div className="flex items-center text-purple-600 font-bold text-xl mb-2">
                    <FaClipboardList className="mr-2" /> {totalSubmissions}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {isLoggedIn ? "Submissions" : "Log in to track activity"}
                  </p>
                </div>

                <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-[0_4px_20px_rgba(128,0,255,0.25)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_6px_30px_rgba(128,0,255,0.4)]">
                  <div className="flex items-center text-purple-600 font-bold text-xl mb-2">
                    <BsFillBarChartFill className="mr-2" /> {accuracyPct}%
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {totalSubmissions > 0
                      ? "Pass rate"
                      : "Solve a problem to see your pass rate"}
                  </p>
                </div>
              </section>
            </div>

            {/* Right Column: Leaderboard */}
            <div className="mt-2 lg:mt-16">
              <Lead />
            </div>
          </div>

          {/* Topics Carousel */}
          <section className="mt-20" data-aos="fade-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Topics</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <button
                  onClick={scrollLeft}
                  className="p-2 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 transition"
                >
                  &lt;
                </button>
                <button
                  onClick={scrollRight}
                  className="p-2 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 transition"
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="relative">
              <div
                ref={scrollRef}
                className="flex space-x-8 overflow-x-auto scroll-smooth pb-2"
              >
                {Object.entries(grouped)
                  .filter(([tag]) =>
                    search.trim()
                      ? tag.toLowerCase().includes(search.trim().toLowerCase())
                      : true
                  )
                  .map(([tag, qs]) => (
                    <TagCard key={tag} tag={tag} questions={qs} />
                  ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
