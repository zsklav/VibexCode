// GET /api/dev/users
// Returns the user list with `status` derived from each user's lastSeen
// heartbeat — see lib/presence.ts.

import { NextResponse } from "next/server";
import { listUsers } from "@/lib/users";
import { derivePresence } from "@/lib/presence";

export const runtime = "nodejs";

export async function GET() {
  try {
    const users = await listUsers(200);
    const decorated = users.map((u) => {
      const lastSeen = u.lastSeen
        ? (u.lastSeen as { toDate?: () => Date }).toDate?.() || null
        : null;
      const createdAt = u.createdAt
        ? (u.createdAt as { toDate?: () => Date }).toDate?.() || null
        : null;
      const updatedAt = u.updatedAt
        ? (u.updatedAt as { toDate?: () => Date }).toDate?.() || null
        : null;
      return {
        _id: u.email,
        email: u.email,
        username: u.username,
        name: u.name || "",
        lastSeen,
        activity: u.activity || "",
        stats: { totalSolved: u.stats?.totalSolved || 0 },
        createdAt,
        updatedAt,
        status: derivePresence(lastSeen),
      };
    });
    return NextResponse.json(decorated);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
