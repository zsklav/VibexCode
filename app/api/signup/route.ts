// POST /api/signup
//
// Body: { firebaseUid, email, username }
//
// Called by lib/firebase-auth after a Firebase Auth signup/signin to ensure
// a matching Firestore users/{email} doc exists. Idempotent — returns 200
// if the user already exists, optionally linking firebaseUid.

import { NextRequest, NextResponse } from "next/server";
import { ensureUser, normalizeEmail } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email: rawEmail, username, firebaseUid } = body || {};

    const email = normalizeEmail(rawEmail);
    if (!email || !username || typeof username !== "string") {
      return NextResponse.json(
        { message: "email and username are required" },
        { status: 400 }
      );
    }

    const { user, created } = await ensureUser({
      email,
      username,
      firebaseUid: typeof firebaseUid === "string" ? firebaseUid : undefined,
    });

    return NextResponse.json(
      {
        message: created ? "User created successfully" : "User already exists",
        user: { email: user.email, username: user.username },
      },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
