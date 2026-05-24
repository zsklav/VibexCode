import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongodb";
import Clans from "@/models/Clans";
import ClanMembers from "@/models/ClanMembers";

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
    if (!isValidObjectId(clanId)) {
      return NextResponse.json(
        { message: "Invalid clan ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const clan = await Clans.findById(clanId);
    if (!clan) {
      return NextResponse.json(
        { message: "Clan not found" },
        { status: 404 }
      );
    }

    if (clan.ownerEmail !== ownerEmail.toLowerCase()) {
      return NextResponse.json(
        { message: "Only the clan owner can kick members" },
        { status: 403 }
      );
    }

    const targetEmail = memberEmailToKick.toLowerCase();
    if (targetEmail === clan.ownerEmail) {
      return NextResponse.json(
        { message: "The owner cannot kick themselves" },
        { status: 400 }
      );
    }

    const result = await ClanMembers.deleteOne({ email: targetEmail, clanId });
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "User is not a member of this clan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Successfully kicked user" });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to kick user", error: errMessage },
      { status: 500 }
    );
  }
}
