// POST /api/user/mark-solved
// Body: { userEmail, questionId, difficulty?, submittedAnswer?, language?, executionStats? }
//
// Server-side helper to record a solved question on the user doc. Currently
// no UI surface calls this — /api/submit handles the live submit flow.
// Kept for backend/admin use and parity with the prior Mongo route.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { addSolvedQuestion, normalizeEmail } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userEmail,
      questionId,
      difficulty,
      submittedAnswer,
      language,
      executionStats,
    } = body || {};

    const email = normalizeEmail(userEmail);
    if (!email) {
      return NextResponse.json({ error: "Invalid userEmail" }, { status: 400 });
    }
    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json({ error: "Invalid questionId" }, { status: 400 });
    }

    const result = await addSolvedQuestion(email, {
      questionId,
      difficulty:
        difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
          ? difficulty
          : undefined,
      submittedAnswer,
      language,
      executionStats,
    });

    return NextResponse.json({
      success: true,
      alreadySolved: result.alreadySolved,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    const status = message === "User not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
