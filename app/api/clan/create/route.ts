import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Clans from "@/models/Clans";
import ClanMembers from "@/models/ClanMembers";

export const runtime = "nodejs";

// POST to create a new clan. The creator automatically joins as owner.
// Replaces the previous client-side databases.createDocument() call.
export async function POST(request: NextRequest) {
  try {
    const { userEmail, name } = await request.json();

    if (!userEmail || !name?.trim()) {
      return NextResponse.json(
        { message: "userEmail and name are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const email = userEmail.toLowerCase();

    const existing = await ClanMembers.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { message: "User is already in a clan" },
        { status: 409 }
      );
    }

    const tag = name.trim().substring(0, 4).toUpperCase();
    const clan = await Clans.create({
      name: name.trim(),
      tag,
      ownerEmail: email,
    });
    await ClanMembers.create({ email, clanId: clan._id });

    return NextResponse.json({
      $id: clan._id.toString(),
      name: clan.name,
      tag: clan.tag,
      memberCount: 1,
      ownerEmail: clan.ownerEmail,
    });
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to create clan", error: errMessage },
      { status: 500 }
    );
  }
}
