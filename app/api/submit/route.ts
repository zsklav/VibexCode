// File: /app/api/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Submissions from "@/models/Submissions";

export const runtime = "nodejs";

const POINTS_BY_DIFFICULTY: Record<"easy" | "medium" | "hard", number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

function pointsFor(
  difficulty: string | undefined,
  passed: boolean | undefined
): number {
  if (!passed) return 0;
  if (
    difficulty === "easy" ||
    difficulty === "medium" ||
    difficulty === "hard"
  ) {
    return POINTS_BY_DIFFICULTY[difficulty];
  }
  return POINTS_BY_DIFFICULTY.easy;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userEmail,
      userName,
      questionId,
      questionTitle,
      answerMarkdown,
      submittedAt,
      // New scoring fields (all optional for back-compat).
      passed,
      code,
      language,
      difficulty,
      runtimeMs,
      memoryKb,
    } = body || {};

    if (!userEmail || !questionId || !answerMarkdown) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing required fields: userEmail, questionId and answerMarkdown",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const points = pointsFor(difficulty, passed);

    const newSubmission = await Submissions.create({
      userEmail,
      userName,
      questionId,
      questionTitle,
      answerMarkdown,
      submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
      passed: Boolean(passed),
      code,
      language,
      difficulty,
      runtimeMs:
        typeof runtimeMs === "number" && Number.isFinite(runtimeMs)
          ? runtimeMs
          : undefined,
      memoryKb:
        typeof memoryKb === "number" && Number.isFinite(memoryKb)
          ? memoryKb
          : undefined,
      points,
    });

    return NextResponse.json(
      { success: true, submission: newSubmission, points },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submission POST error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
