// PUT /api/dev/users/[userId]/status
// Body: { status: "Online" | "Idle" | "Busy" | "Offline" }
//
// Updates the user's status field on the MongoDB Users document.
// Previously used node-appwrite's users.updatePrefs(); migrated to Mongoose.

import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongodb";
import UserModel from "@/models/Users";

const ALLOWED_STATUSES = ["Online", "Idle", "Busy", "Offline"] as const;
type UserStatus = (typeof ALLOWED_STATUSES)[number];

function isUserStatus(s: unknown): s is UserStatus {
  return (
    typeof s === "string" && (ALLOWED_STATUSES as readonly string[]).includes(s)
  );
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body || {};

  if (!isValidObjectId(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }
  if (!isUserStatus(status)) {
    return NextResponse.json(
      {
        error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Status updated", status });
  } catch (error) {
    console.error("Failed to update status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
