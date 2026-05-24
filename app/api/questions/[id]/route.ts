import connectDB from "@/lib/mongodb";
import Questions from "@/models/Questions";
import { isAdminEmail } from "@/lib/auth";
import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// GET /api/questions/[id]
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  await connectDB();
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid question id" },
      { status: 400 }
    );
  }

  try {
    const question = await Questions.findById(id);
    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, question }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching question:", errorMessage);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/questions/[id]
// Body: { userEmail, title?, description?, testcases?, solutions?, tags?, difficulty? }
// Admin-only. Updates only the fields that are present in the body.
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
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

  // Whitelist editable fields.
  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title.trim();
  if (typeof body.description === "string")
    update.description = body.description.trim();
  if (typeof body.testcases === "string")
    update.testcases = body.testcases.trim();
  if (typeof body.solutions === "string")
    update.solutions = body.solutions.trim();
  if (
    typeof body.difficulty === "string" &&
    ["easy", "medium", "hard"].includes(body.difficulty)
  ) {
    update.difficulty = body.difficulty;
  }
  if (Array.isArray(body.tags)) {
    update.tags = body.tags
      .filter((t: unknown): t is string => typeof t === "string")
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { success: false, error: "No editable fields provided" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const updated = await Questions.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, question: updated });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating question:", errorMessage);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/questions/[id]
//   Body: { userEmail }   — admin-only
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!isValidObjectId(id)) {
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
    await connectDB();
    const deleted = await Questions.findByIdAndDelete(id);
    if (!deleted) {
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
