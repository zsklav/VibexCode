// POST /api/user/heartbeat
//   Body: { email }
//   Bumps the user's lastSeen so derivePresence() reports them as Online.
//   Called every ~30s by the client while the page is visible.

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Users from "@/models/Users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    await connectDB();
    // No-op if the user doesn't exist — we don't want a heartbeat to create
    // records, and Mongo returns matchedCount=0 silently.
    await Users.updateOne(
      { email },
      { $set: { lastSeen: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record heartbeat";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
