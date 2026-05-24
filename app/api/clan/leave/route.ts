import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Clans from "@/models/Clans";
import ClanMembers from "@/models/ClanMembers";

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

    await connectDB();
    const email = userEmail.toLowerCase();

    const membership = await ClanMembers.findOne({ email });
    if (!membership) {
      return NextResponse.json(
        { message: "User is not in a clan" },
        { status: 404 }
      );
    }

    const clanId = membership.clanId;
    await ClanMembers.deleteOne({ _id: membership._id });

    // Handle ownership transfer or empty-clan cleanup when the owner leaves.
    const clan = await Clans.findById(clanId);
    if (clan && clan.ownerEmail === email) {
      const remaining = await ClanMembers.countDocuments({ clanId });
      if (remaining === 0) {
        await Clans.deleteOne({ _id: clanId });
      } else {
        // Promote the oldest remaining member to owner.
        const next = await ClanMembers.findOne({ clanId }).sort({
          createdAt: 1,
        });
        if (next) {
          clan.ownerEmail = next.email;
          await clan.save();
        }
      }
    }

    return NextResponse.json({ message: "Successfully left clan" });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to leave clan", error: errMessage },
      { status: 500 }
    );
  }
}
