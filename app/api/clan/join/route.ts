// POST /api/clan/join
//   Body: { userEmail, clanId }

import { NextRequest, NextResponse } from "next/server";
import {
  joinClan,
  AlreadyInClanError,
  ClanNotFoundError,
} from "@/lib/clans";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userEmail, clanId } = await request.json();
    if (!userEmail || !clanId) {
      return NextResponse.json(
        { message: "userEmail and clanId are required" },
        { status: 400 }
      );
    }

    await joinClan(userEmail, clanId);
    return NextResponse.json({ message: "Successfully joined clan" });
  } catch (error) {
    if (error instanceof ClanNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof AlreadyInClanError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to join clan", error: errMessage },
      { status: 500 }
    );
  }
}
