// GET /api/user-submissions?userEmail=foo@bar.com
//   Returns all of the user's submissions, newest-first.

import { NextRequest, NextResponse } from "next/server";
import { listUserSubmissions } from "@/lib/submissions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("userEmail");
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "Missing userEmail parameter" },
        { status: 400 }
      );
    }
    const submissions = await listUserSubmissions(userEmail);
    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error("Submission GET error:", error);
    const message =
      error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
