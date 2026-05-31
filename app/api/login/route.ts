// POST /api/login — DEPRECATED.
//
// Firebase Auth is the primary login path now (see app/auth/firebase-auth.ts).
// This legacy bcrypt-based route is unused by any UI and returns 410.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Use Firebase Auth — this endpoint is deprecated." },
    { status: 410 }
  );
}
