// POST /api/submit
//   Body: { userEmail, userName, questionId, questionTitle, answerMarkdown,
//           submittedAt?, passed?, code?, language?, difficulty?,
//           runtimeMs?, memoryKb? }
//
// Writes a submissions doc and (if passed) bumps the denormalized
// leaderboard/{email} doc that Leaderboards / Lead read from.

import { NextRequest, NextResponse } from "next/server";
import { createSubmission } from "@/lib/submissions";

export const runtime = "nodejs";

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

    const { submission, points } = await createSubmission({
      userEmail,
      userName,
      questionId,
      questionTitle,
      answerMarkdown,
      submittedAt,
      passed,
      code,
      language,
      difficulty,
      runtimeMs,
      memoryKb,
    });

    return NextResponse.json(
      { success: true, submission, points },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submission POST error:", error);
    const message =
      error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
