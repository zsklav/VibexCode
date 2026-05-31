// PATCH  /api/tasks/[id]  — update task completion. Body: { completed, userId }
// DELETE /api/tasks/[id]  — delete task. Body: { userId }
//
// Ownership: only the task's userId can mutate it.

import { NextRequest, NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/lib/tasks";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { completed, userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ message: "Missing userId" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
  }

  try {
    const updated = await updateTask(id, userId, { completed });
    if (!updated) {
      return NextResponse.json(
        { message: "Task not found or not yours" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, task: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ message, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ message: "Missing userId" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
  }

  try {
    const ok = await deleteTask(id, userId);
    if (!ok) {
      return NextResponse.json(
        { message: "Task not found or not yours" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete task";
    return NextResponse.json({ message, error: message }, { status: 500 });
  }
}
