import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongodb";
import Clans from "@/models/Clans";
import ClanMembers from "@/models/ClanMembers";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clanId: string }> }
) {
  try {
    const { clanId } = await params;

    if (!clanId || !isValidObjectId(clanId)) {
      return NextResponse.json(
        { message: "Invalid clan ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const clan = await Clans.findById(clanId).lean<{
      _id: { toString: () => string };
      name: string;
      tag: string;
      ownerEmail: string;
    } | null>();
    if (!clan) {
      return NextResponse.json(
        { message: "Clan not found" },
        { status: 404 }
      );
    }

    const memberCount = await ClanMembers.countDocuments({ clanId });

    return NextResponse.json({
      $id: clan._id.toString(),
      name: clan.name,
      tag: clan.tag,
      memberCount,
      ownerEmail: clan.ownerEmail,
    });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch clan data", error: errMessage },
      { status: 500 }
    );
  }
}
