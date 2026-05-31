// GET  /api/questions          — list all questions (optional ?limit=N)
// POST /api/questions          — admin-only: create
//   Body: { userEmail, title, description, testcases?, solutions?, tags?, difficulty? }
// HEAD /api/questions          — health probe

import { NextResponse } from "next/server";
import { listQuestions, createQuestion } from "@/lib/questions";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!isAdminEmail(data.userEmail)) {
      return NextResponse.json(
        { success: false, error: "Only admins can create questions" },
        { status: 403 }
      );
    }

    const question = await createQuestion({
      title: data.title,
      description: data.description,
      testcases: data.testcases,
      solutions: data.solutions,
      tags: data.tags,
      difficulty: data.difficulty,
    });

    return NextResponse.json({ success: true, question });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("required") || message.includes("Difficulty must")
        ? 400
        : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "0");
    const questions = await listQuestions(limit > 0 ? limit : 0);
    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch questions";
    return NextResponse.json(
      { success: false, error: "Failed to fetch questions", details: message },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
