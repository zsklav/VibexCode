// POST /api/user/heartbeat
//   Body: { email, device?, customStatus?, activity? }
//   Bumps the user's lastSeen so derivePresence() reports them as Online.
//   Called every ~30s by the client while the page is visible.

import { NextRequest, NextResponse } from "next/server";
import { db, FieldValue } from "@/lib/firebase-admin";
import { normalizeEmail } from "@/lib/firestore-helpers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body?.email) || "";
    const device = body?.device === "Mobile" ? "Mobile" : "Desktop";
    const activity =
      typeof body?.activity === "string" ? body.activity.slice(0, 40) : "heartbeat";
    const customStatus =
      typeof body?.customStatus === "string"
        ? body.customStatus.trim().slice(0, 80)
        : undefined;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    const users = db.collection("users");
    const snapshot = await users.where("email", "==", email).limit(1).get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.set(
        {
          lastSeen: FieldValue.serverTimestamp(),
          presenceDevice: device,
          presenceActivity: activity,
          ...(customStatus !== undefined ? { customStatus } : {}),
        },
        { merge: true }
      );
    }

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
