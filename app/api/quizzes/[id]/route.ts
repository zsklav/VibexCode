// DELETE /api/quizzes/[id]
//   Body: { userEmail }   — admin-only

import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongodb";
import Quizzes from "@/models/Quizzes";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!isValidObjectId(id)) {
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

    await connectDB();
    const result = await Quizzes.findByIdAndDelete(id);
    if (!result) {
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
