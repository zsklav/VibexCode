// GET /api/user/solved-questions?userEmail=foo@bar.com
//
// Returns the user's solved questions grouped by tag/difficulty.
// Reads the user's solvedQuestions array (Firestore) and joins against the
// questions collection. Question metadata isn't migrated until Phase 2 —
// for now this returns counts only.

import { NextResponse } from "next/server";
import { getUser, normalizeEmail } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = normalizeEmail(searchParams.get("userEmail"));

    if (!email) {
      return NextResponse.json(
        { error: "userEmail is required" },
        { status: 400 }
      );
    }

    const user = await getUser(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const solvedIds = (user.solvedQuestions || []).map((sq) => sq.questionId);

    // TODO (Phase 2): once questions are in Firestore, join with their
    // tags/difficulty to recompute the by-category breakdown the old
    // Mongo route returned. For now this just exposes the IDs.
    return NextResponse.json({
      success: true,
      solvedQuestions: [
        {
          name: "all",
          questionCount: solvedIds.length,
          progress: 0,
          questions: solvedIds,
        },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
