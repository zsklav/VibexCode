// GET  /api/tasks?userId=<uid>   — list a user's tasks, newest-first
// POST /api/tasks                — create a task
//   Body: { text, priority, userId }

import { NextRequest, NextResponse } from "next/server";
import { listUserTasks, createTask, TaskPriority } from "@/lib/tasks";

export const runtime = "nodejs";

interface TaskBody {
  text: string;
  priority: TaskPriority;
  userId: string;
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ message: "Missing userId" }, { status: 400 });
  }
  try {
    const tasks = await listUserTasks(userId);
    return NextResponse.json(tasks);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch tasks";
    return NextResponse.json({ message, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, priority, userId } = (await req.json()) as TaskBody;
    if (!text || !priority || !userId) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }
    const task = await createTask({ text, priority, userId });
    return NextResponse.json(task);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ message, error: message }, { status: 500 });
  }
}
