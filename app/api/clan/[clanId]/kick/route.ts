// POST /api/clan/[clanId]/kick
//   Body: { ownerEmail, memberEmailToKick }

import { NextRequest, NextResponse } from "next/server";
import {
  kickMember,
  ClanNotFoundError,
  NotOwnerError,
  CannotKickSelfError,
  MemberNotFoundError,
} from "@/lib/clans";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clanId: string }> }
) {
  try {
    const { clanId } = await params;
    const { ownerEmail, memberEmailToKick } = await request.json();

    if (!ownerEmail || !memberEmailToKick) {
      return NextResponse.json(
        { message: "ownerEmail and memberEmailToKick are required" },
        { status: 400 }
      );
    }
    if (!clanId) {
      return NextResponse.json(
        { message: "Invalid clan ID" },
        { status: 400 }
      );
    }

    await kickMember({ clanId, ownerEmail, memberEmail: memberEmailToKick });
    return NextResponse.json({ message: "Successfully kicked user" });
  } catch (error) {
    if (error instanceof ClanNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof NotOwnerError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof CannotKickSelfError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof MemberNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to kick user", error: errMessage },
      { status: 500 }
    );
  }
}
