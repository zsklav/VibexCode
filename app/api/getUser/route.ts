// POST /api/getUser
//   Body: { email }
//   Returns: { username }

import { NextResponse } from "next/server";
import { getUser, normalizeEmail } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await getUser(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ username: user.username });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
