// GET  /api/quizzes              — upcoming quizzes (date >= now)
// GET  /api/quizzes?scope=all    — every quiz (admin UI)
// POST /api/quizzes              — admin-only create
//   Body: { userEmail, title, description?, date (ISO string), registrationLink? }

import { NextRequest, NextResponse } from "next/server";
import { listQuizzes, createQuiz } from "@/lib/quizzes";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") === "all" ? "all" : "upcoming";
    const quizzes = await listQuizzes({ scope });
    return NextResponse.json({ success: true, quizzes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch quizzes";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userEmail, title, description, date, registrationLink } = body || {};

    if (!isAdminEmail(userEmail)) {
      return NextResponse.json(
        { success: false, error: "Only admins can create quizzes" },
        { status: 403 }
      );
    }

    const quiz = await createQuiz({
      title,
      description,
      date,
      registrationLink,
      createdByEmail: userEmail,
    });

    return NextResponse.json({ success: true, quiz }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create quiz";
    const status = message.includes("required") || message.includes("valid")
      ? 400
      : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
