// POST /api/user/heartbeat
//   Body: { email }
//   Bumps the user's lastSeen so derivePresence() reports them as Online.
//   Called every ~2 min by the client while the page is visible.

import { NextRequest, NextResponse } from "next/server";
import { bumpHeartbeat, normalizeEmail } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    await bumpHeartbeat(email);
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
