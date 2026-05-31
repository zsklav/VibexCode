// GET /api/topics
//
// Distinct tags currently used by Questions with per-tag count. Reads from
// the denormalized `topics/{tag}` collection maintained by lib/questions.ts
// on question writes.
//
// Shape: [{ name: "arrays", count: 12 }, ...]

import { NextResponse } from "next/server";
import { listTopics } from "@/lib/questions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const topics = await listTopics();
    return NextResponse.json({ success: true, topics });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch topics";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
