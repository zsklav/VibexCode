// GET /api/dev/users
// Lists users from MongoDB (dev/admin debugging endpoint).
// Previously used the node-appwrite Users SDK; migrated to Mongoose so the
// app no longer depends on Appwrite for this debug surface.

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import UserModel from "@/models/Users";

export async function GET() {
  try {
    await connectDB();

    const users = await UserModel.find({})
      .select(
        "email username name status activity stats.totalSolved createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
