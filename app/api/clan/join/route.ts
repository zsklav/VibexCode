import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongodb";
import Clans from "@/models/Clans";
import ClanMembers from "@/models/ClanMembers";

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
    if (!isValidObjectId(clanId)) {
      return NextResponse.json(
        { message: "Invalid clan ID" },
        { status: 400 }
      );
    }

    await connectDB();
    const email = userEmail.toLowerCase();

    const clan = await Clans.findById(clanId);
    if (!clan) {
      return NextResponse.json(
        { message: "Clan not found" },
        { status: 404 }
      );
    }

    const existing = await ClanMembers.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { message: "User is already in a clan" },
        { status: 409 }
      );
    }

    await ClanMembers.create({ email, clanId: clan._id });

    return NextResponse.json({ message: "Successfully joined clan" });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to join clan", error: errMessage },
      { status: 500 }
    );
  }
}
