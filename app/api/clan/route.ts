import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Clans from "@/models/Clans";
import ClanMembers from "@/models/ClanMembers";

export const runtime = "nodejs";

// GET the current user's clan, by email.
// Replaces the previous Appwrite-backed implementation.
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

    await connectDB();

    const email = userEmail.toLowerCase();
    const membership = await ClanMembers.findOne({ email }).lean<{
      _id: unknown;
      clanId: unknown;
    } | null>();
    if (!membership) {
      return NextResponse.json(
        { message: "User not in a clan" },
        { status: 404 }
      );
    }

    const clan = await Clans.findById(membership.clanId).lean<{
      _id: { toString: () => string };
      name: string;
      tag: string;
      ownerEmail: string;
    } | null>();
    if (!clan) {
      // Stale pointer to a deleted clan — clean up.
      await ClanMembers.deleteOne({ _id: membership._id });
      return NextResponse.json(
        { message: "User not in a clan" },
        { status: 404 }
      );
    }

    const memberCount = await ClanMembers.countDocuments({
      clanId: clan._id,
    });

    return NextResponse.json({
      $id: clan._id.toString(),
      name: clan.name,
      tag: clan.tag,
      memberCount,
      ownerEmail: clan.ownerEmail,
    });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { message: "Server error", error: errMessage },
      { status: 500 }
    );
  }
}
