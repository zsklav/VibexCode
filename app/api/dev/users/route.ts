// GET /api/dev/users
// Returns the user list with `status` derived from each user's lastSeen
// heartbeat — see lib/presence.ts. The stored `status` enum is legacy.

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UserModel from "@/models/Users";
import { derivePresence } from "@/lib/presence";

type LeanUser = {
  _id: unknown;
  email: string;
  username?: string;
  name?: string;
  lastSeen?: Date;
  activity?: string;
  stats?: { totalSolved?: number };
  createdAt?: Date;
  updatedAt?: Date;
};

export async function GET() {
  try {
    await connectDB();

    const users = await UserModel.find({})
      .select(
        "email username name lastSeen activity stats.totalSolved createdAt updatedAt"
      )
      .sort({ lastSeen: -1, createdAt: -1 })
      .limit(200)
      .lean<LeanUser[]>();

    const decorated = users.map((u) => ({
      ...u,
      status: derivePresence(u.lastSeen),
    }));

    return NextResponse.json(decorated);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
