// GET    /api/questions/[id]   — fetch one
// PATCH  /api/questions/[id]   — admin-only edit
//   Body: { userEmail, title?, description?, testcases?, solutions?, tags?, difficulty? }
// DELETE /api/questions/[id]   — admin-only delete
//   Body: { userEmail }

import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";
import {
  getQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/lib/questions";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Invalid question id" },
      { status: 400 }
    );
  }

  try {
    const question = await getQuestion(id);
    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, question });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching question:", message);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Invalid question id" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (!isAdminEmail(body?.userEmail)) {
    return NextResponse.json(
      { success: false, error: "Only admins can edit questions" },
      { status: 403 }
    );
  }

  const patch: {
    title?: string;
    description?: string;
    testcases?: string;
    solutions?: string;
    tags?: string[];
    difficulty?: "easy" | "medium" | "hard";
  } = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.testcases === "string") patch.testcases = body.testcases;
  if (typeof body.solutions === "string") patch.solutions = body.solutions;
  if (
    typeof body.difficulty === "string" &&
    ["easy", "medium", "hard"].includes(body.difficulty)
  ) {
    patch.difficulty = body.difficulty;
  }
  if (Array.isArray(body.tags)) patch.tags = body.tags;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { success: false, error: "No editable fields provided" },
      { status: 400 }
    );
  }

  try {
    const updated = await updateQuestion(id, patch);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, question: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Invalid question id" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (!isAdminEmail(body?.userEmail)) {
    return NextResponse.json(
      { success: false, error: "Only admins can delete questions" },
      { status: 403 }
    );
  }

  try {
    const ok = await deleteQuestion(id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete question";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
