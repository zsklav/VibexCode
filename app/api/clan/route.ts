// GET /api/clan?userEmail=foo@bar.com
//   Returns the user's clan (with member count), or 404 if not in one.

import { NextRequest, NextResponse } from "next/server";
import { getUserClan } from "@/lib/clans";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("userEmail");

    if (!userEmail) {
      return NextResponse.json(
        { message: "userEmail is required" },
        { status: 400 }
      );
    }

    const clan = await getUserClan(userEmail);
    if (!clan) {
      return NextResponse.json(
        { message: "User not in a clan" },
        { status: 404 }
      );
    }
    return NextResponse.json(clan);
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { message: "Server error", error: errMessage },
      { status: 500 }
    );
  }
}
