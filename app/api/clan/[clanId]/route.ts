// GET /api/clan/[clanId]
//   Returns clan info + member count.

import { NextRequest, NextResponse } from "next/server";
import { getClan } from "@/lib/clans";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clanId: string }> }
) {
  try {
    const { clanId } = await params;
    if (!clanId) {
      return NextResponse.json(
        { message: "Invalid clan ID" },
        { status: 400 }
      );
    }

    const clan = await getClan(clanId);
    if (!clan) {
      return NextResponse.json(
        { message: "Clan not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(clan);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch clan data", error: errMessage },
      { status: 500 }
    );
  }
}
