"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import { runJudge0Advanced } from "@/lib/judge0";
import {
  doc,
  setDoc,
  arrayUnion,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "../components/Navbar";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import SuccessModal from "../components/SuccessModal";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

type DiffLine = { type: "same" | "add" | "remove"; value: string };
function getUnifiedDiff(a: string, b: string): DiffLine[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const maxLen = Math.max(aLines.length, bLines.length);
  const diff: DiffLine[] = [];
  for (let i = 0; i < maxLen; i++) {
    if (aLines[i] === bLines[i]) {
      if (aLines[i] !== undefined)
        diff.push({ type: "same", value: aLines[i] });
    } else {
      if (aLines[i] !== undefined)
        diff.push({ type: "remove", value: aLines[i] });
      if (bLines[i] !== undefined) diff.push({ type: "add", value: bLines[i] });
    }
  }
  return diff;
}

type Question = {
  _id: string;
  title: string;
  description: string;
  testcases?: string;
  solutions?: string;
  difficulty?: "easy" | "medium" | "hard";
};

type LastRunStats = {
  runtimeMs?: number;
  memoryKb?: number;
};

const languages = ["Javascript", "Python", "Java", "C++"] as const;
type Language = (typeof languages)[number];

const languageMap: Record<
  Language,
  { monacoLang: string; judge0Id: number; defaultCode: string }
> = {
  Javascript: {
    monacoLang: "javascript",
    judge0Id: 63,
    defaultCode: `// JavaScript Hello World
console.log("Hello, World!");`,
  },
  Python: {
    monacoLang: "python",
    judge0Id: 71,
    defaultCode: `# Python Hello World
print("Hello, World!")`,
  },
  Java: {
    monacoLang: "java",
    judge0Id: 62,
    defaultCode: `// Java Hello World
public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, World!");        
  }
}`,
  },
  "C++": {
    monacoLang: "cpp",
    judge0Id: 54,
    defaultCode: `// C++ Hello World
#include <iostream>
using namespace std;
int main() {
  cout << "Hello, World!" << endl;
  return 0;
}`,
  },
};

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const questionId = searchParams?.get("id");

  const { userData, status: isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>("Javascript");
  const [code, setCode] = useState(languageMap[language].defaultCode);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [answerInput, setAnswerInput] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRunStats, setLastRunStats] = useState<LastRunStats>({});

  // Success Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false); // <-- MODAL

  useEffect(() => {
    if (!questionId) {
      setLoading(false);
      return;
    }

    const fetchQuestion = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/questions/${questionId}`);
        if (!res.ok)
          throw new Error(`Failed to fetch question (${res.status})`);
        const data = await res.json();
        if (data.success) {
          setQuestion(data.question);
          setAnswerInput(data.question.solutions || "");
          setCode(languageMap[language].defaultCode);
        } else {
          throw new Error(data.error || "Unknown error");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [questionId, language]);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setCode(languageMap[newLanguage].defaultCode);
    setOutput("");
    setIsCorrect(null);
    setDiffLines([]);
  };

  const handleRun = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setOutput("⏳ Running...");
    setIsCorrect(null);
    setDiffLines([]);

    try {
      const result = await runJudge0Advanced(
        code,
        languageMap[language].judge0Id
      );

      let outputStr = "";
      if ("error" in result && result.error) {
        outputStr = `❌ API Error:\n${result.error}`;
      } else if (result.stderr) {
        outputStr = `❌ Runtime Error:\n${result.stderr}`;
      } else if (result.compile_output) {
        outputStr = `⚠️ Compile Error:\n${result.compile_output}`;
      } else if (result.stdout) {
        // Judge0 returns time as a string in seconds (e.g. "0.123"). Convert
        // to ms for storage so all our metrics are in a single unit.
        const timeSec =
          typeof result.time === "string" || typeof result.time === "number"
            ? parseFloat(String(result.time))
            : NaN;
        const runtimeMs = Number.isFinite(timeSec)
          ? Math.round(timeSec * 1000)
          : undefined;
        const memoryKb =
          typeof result.memory === "number"
            ? result.memory
            : typeof result.memory === "string"
            ? parseInt(result.memory, 10) || undefined
            : undefined;
        setLastRunStats({ runtimeMs, memoryKb });

        const executionInfo =
          result.time || result.memory
            ? `\n\n📊 Execution Time: ${result.time || "N/A"}s | Memory: ${
                result.memory || "N/A"
              }KB`
            : "";
        outputStr = `✅ Output:\n${result.stdout}${executionInfo}`;
      } else {
        outputStr = "✅ Code executed successfully (no output)";
      }
      setOutput(outputStr);

      if (!questionId) {
        setIsCorrect(null);
        setDiffLines([]);
        setIsRunning(false);
        return;
      }

      const userOutput = (result.stdout || "").trim().replace(/\r\n/g, "\n");
      const expectedOutput = (question?.solutions || "")
        .trim()
        .replace(/\r\n/g, "\n");

      if (userOutput && expectedOutput && userOutput === expectedOutput) {
        setIsCorrect(true);
        setDiffLines([]);
      } else {
        setIsCorrect(false);
        if (userOutput && expectedOutput) {
          setDiffLines(getUnifiedDiff(userOutput, expectedOutput));
        } else {
          setDiffLines([]);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        setOutput(`❌ Execution Error:\n${error.message}`);
      } else {
        setOutput(`❌ Unknown Error:\n${JSON.stringify(error)}`);
      }
      setIsCorrect(false);
      setDiffLines([]);
    }
    setIsRunning(false);
  };

  const handleResetCode = () => {
    setCode(languageMap[language].defaultCode);
    setOutput("");
    setIsCorrect(null);
    setDiffLines([]);
  };

  const handleClearOutput = () => {
    setOutput("");
    setIsCorrect(null);
    setDiffLines([]);
  };

  const handleSubmit = async () => {
    if (!questionId || !question) return;
    if (!isLoggedIn || !userData) {
      alert("⚠️ You must be logged in to submit an answer.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: userData.email,
          userName: userData.name,
          questionId,
          questionTitle: question.title,
          answerMarkdown: answerInput,
          submittedAt: new Date().toISOString(),
          // Scoring fields (added in A3).
          passed: isCorrect === true,
          code,
          language,
          difficulty: question.difficulty,
          runtimeMs: lastRunStats.runtimeMs,
          memoryKb: lastRunStats.memoryKb,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit answer");
      }

      // Update Firestore leaderboard. arrayUnion de-dupes so re-solving the
      // same question doesn't inflate the count. We also increment a running
      // points total so the leaderboard can rank by points, not just count.
      // Best-effort: a failure here shouldn't block the success modal — the
      // submission is already in Mongo.
      try {
        const earnedPoints =
          typeof data.points === "number" ? data.points : 0;
        await setDoc(
          doc(db, "leaderboard", userData.email),
          {
            name: userData.name,
            email: userData.email,
            solvedQuestionIds: arrayUnion(questionId),
            points: increment(earnedPoints),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (lbErr) {
        // Surface this loudly to the user during debugging — silent failures
        // here led to a "leaderboard not updating" mystery before.
        console.error("❌ Leaderboard Firestore write failed:", lbErr);
        const msg =
          lbErr instanceof Error ? lbErr.message : String(lbErr);
        alert(
          "Submitted to DB ✓ but leaderboard write failed:\n\n" +
            msg +
            "\n\nCheck browser console for the full error."
        );
      }

      // SHOW MODAL INSTEAD OF ALERT!
      setShowSuccessModal(true); // <-- MODAL
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col dark:bg-[#020612] text-gray-900 dark:text-white">
      <Navbar />
      <div className="flex flex-1 p-3 gap-3 overflow-hidden flex-col lg:flex-row min-h-0">
        {/* Left — Question + Testcases + Notes (stacked, scrollable) */}
        <div className="w-full lg:w-2/5 flex flex-col gap-3 overflow-hidden min-h-0">
          <section className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-[0_4px_20px_rgba(128,0,255,0.08)] flex flex-col min-h-0 flex-[2]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">🧠 Question</h2>
              {question?.difficulty && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded uppercase font-medium ${
                    question.difficulty === "easy"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : question.difficulty === "medium"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  }`}
                >
                  {question.difficulty}
                </span>
              )}
            </div>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : error ? (
              <p className="text-sm text-red-500">Error: {error}</p>
            ) : question ? (
              <>
                <h3 className="font-bold text-base mb-2">{question.title}</h3>
                <div className="text-sm overflow-auto flex-1 prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{question.description}</ReactMarkdown>
                </div>
              </>
            ) : !questionId ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <h3 className="font-semibold mb-1 text-gray-700 dark:text-gray-200">
                  Free Coding Playground
                </h3>
                <p>
                  Pick a problem from{" "}
                  <a
                    href="/problems"
                    className="text-blue-500 hover:underline"
                  >
                    Problems
                  </a>{" "}
                  to attempt one, or just experiment with the editor.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No question found</p>
            )}
          </section>

          <section className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-[0_4px_20px_rgba(128,0,255,0.08)] flex flex-col min-h-0 flex-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              🧪 Testcases
            </h2>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : question?.testcases ? (
              <pre className="text-sm whitespace-pre-wrap overflow-auto flex-1 font-mono bg-gray-50 dark:bg-zinc-900 rounded p-2">
                {question.testcases}
              </pre>
            ) : !questionId ? (
              <p className="text-sm text-gray-500">
                No challenge selected.
              </p>
            ) : (
              <p className="text-sm text-gray-500">No testcases available.</p>
            )}
          </section>

          <section className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-[0_4px_20px_rgba(128,0,255,0.08)] flex flex-col min-h-0 flex-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              📝 Notes
            </h2>
            <textarea
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Quick notes on your approach (required for submit)..."
              className="flex-1 min-h-[60px] resize-none p-2 border border-gray-200 dark:border-zinc-700 rounded bg-gray-50 dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </section>
        </div>

        {/* Right — Compiler (top) + Result (bottom) */}
        <div className="w-full lg:w-3/5 flex flex-col gap-3 overflow-hidden min-h-0">
          <section className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-[0_4px_20px_rgba(128,0,255,0.08)] flex flex-col min-h-0 flex-[2]">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">💻 Compiler</h2>
              <div className="flex items-center gap-2">
                <select
                  className="text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 px-2 py-1 rounded"
                  value={language}
                  onChange={(e) =>
                    handleLanguageChange(e.target.value as Language)
                  }
                  disabled={isRunning}
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleResetCode}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded"
                  disabled={isRunning}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 rounded overflow-hidden border border-gray-200 dark:border-zinc-700">
              <MonacoEditor
                height="100%"
                language={languageMap[language].monacoLang}
                value={code}
                theme="vs-dark"
                onChange={(value) => setCode(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              {isCorrect === true && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Answer"}
                </button>
              )}
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                onClick={handleRun}
                disabled={isRunning}
              >
                {isRunning ? "Running…" : "Run Code"}
              </button>
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-[0_4px_20px_rgba(128,0,255,0.08)] flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                📄 Result
              </h2>
              {output && (
                <button
                  onClick={handleClearOutput}
                  className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto min-h-0 space-y-2">
              <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 dark:bg-zinc-900 rounded p-3 min-h-[40px]">
                {output || (
                  <span className="text-gray-400">
                    Output will appear here after running your code.
                  </span>
                )}
              </pre>

              {isCorrect === true && (
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                  🎉 Correct! Hit Submit Answer above.
                </p>
              )}

              {isCorrect === false && diffLines.length > 0 && (
                <>
                  <p className="text-red-500 text-sm font-medium">
                    🚫 Output doesn&apos;t match expected — diff below:
                  </p>
                  <div className="rounded border border-gray-200 dark:border-zinc-700 p-2 overflow-x-auto text-xs font-mono bg-gray-50 dark:bg-zinc-900">
                    {diffLines.map((line, idx) =>
                      line.type === "same" ? (
                        <div key={idx} className="text-gray-500">
                          &nbsp; {line.value}
                        </div>
                      ) : line.type === "remove" ? (
                        <div
                          key={idx}
                          className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        >
                          - {line.value}
                        </div>
                      ) : (
                        <div
                          key={idx}
                          className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        >
                          + {line.value}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}

              {isCorrect === false && !diffLines.length && (
                <p className="text-red-500 text-sm font-medium">
                  🚫 Output doesn&apos;t match expected answer.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal onClose={() => setShowSuccessModal(false)} />
      )}
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center dark:bg-[#020612] text-gray-500 dark:text-gray-300">
          Loading playground...
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
