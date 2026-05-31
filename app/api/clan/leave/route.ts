// POST /api/clan/leave
//   Body: { userEmail }
//
// Owner-leaving rules:
//   - empty clan after leave → clan is deleted
//   - non-empty → oldest remaining member becomes the new owner

import { NextRequest, NextResponse } from "next/server";
import { leaveClan, NotInClanError } from "@/lib/clans";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();
    if (!userEmail) {
      return NextResponse.json(
        { message: "userEmail is required" },
        { status: 400 }
      );
    }

    await leaveClan(userEmail);
    return NextResponse.json({ message: "Successfully left clan" });
  } catch (error) {
    if (error instanceof NotInClanError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to leave clan", error: errMessage },
      { status: 500 }
    );
  }
}
