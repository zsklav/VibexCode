// GET /api/users  — list emails + usernames for the user-search widget.

import { NextResponse } from "next/server";
import { listUsers } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    const users = await listUsers(500);
    return NextResponse.json({
      users: users.map((u) => ({ email: u.email, username: u.username })),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    const message =
      error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
