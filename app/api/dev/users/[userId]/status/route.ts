// PUT /api/dev/users/[userId]/status — DEPRECATED.
//
// Status is now derived from each user's lastSeen heartbeat (see
// lib/presence.ts). Manually setting status no longer makes sense — kept as
// a 410 stub so any stale client gets a clear signal rather than a 404.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PUT() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. User status is derived from lastSeen (see /lib/presence.ts).",
    },
    { status: 410 }
  );
}
