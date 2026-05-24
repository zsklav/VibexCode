import connectDB from "@/lib/mongodb";
import Users from "@/models/Users";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/signup
 *
 * Two supported shapes (back-compat):
 *
 *  - Firebase path (preferred):
 *    { firebaseUid, email, username }
 *    Creates a Mongo Users record linked to a Firebase Auth account.
 *    Idempotent — returns 200 if the user already exists.
 *
 *  - Legacy bcrypt path:
 *    { email, password, username }
 *    Creates a Mongo Users record with a bcrypt-hashed password. Kept
 *    so anything still POSTing this shape continues to work.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username, firebaseUid } = body || {};

    if (!email || !username) {
      return NextResponse.json(
        { message: "email and username are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedEmail = email.toLowerCase().trim();

    // Idempotency: if a user with this email already exists, just link the
    // Firebase UID (if provided) and return success.
    const existing = await Users.findOne({ email: normalizedEmail });
    if (existing) {
      if (firebaseUid && !existing.firebaseUid) {
        existing.firebaseUid = firebaseUid;
        await existing.save();
      }
      return NextResponse.json(
        {
          message: "User already exists",
          user: { email: existing.email, username: existing.username },
        },
        { status: 200 }
      );
    }

    // Firebase path: no password stored in Mongo (Firebase holds credentials).
    if (firebaseUid) {
      const newUser = await Users.create({
        email: normalizedEmail,
        username,
        firebaseUid,
      });
      return NextResponse.json(
        {
          message: "User created successfully",
          user: { email: newUser.email, username: newUser.username },
        },
        { status: 201 }
      );
    }

    // Legacy bcrypt path.
    if (!password) {
      return NextResponse.json(
        { message: "password or firebaseUid is required" },
        { status: 400 }
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await Users.create({
      email: normalizedEmail,
      username,
      password: hashedPassword,
    });

    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: { email: newUser.email, username: newUser.username },
      },
      { status: 201 }
    );
    response.headers.set(
      "Set-Cookie",
      `token=loggedin; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`
    );
    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
