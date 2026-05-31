// DELETE /api/quizzes/[id]   — admin-only
//   Body: { userEmail }

import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";
import { deleteQuiz } from "@/lib/quizzes";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Invalid quiz id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (!isAdminEmail(body?.userEmail)) {
      return NextResponse.json(
        { success: false, error: "Only admins can delete quizzes" },
        { status: 403 }
      );
    }

    const ok = await deleteQuiz(id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Quiz not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete quiz";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
