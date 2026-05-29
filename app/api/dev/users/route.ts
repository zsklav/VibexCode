// GET /api/dev/users
// Returns the user list with `status` derived from each user's lastSeen
// heartbeat — see lib/presence.ts. The stored `status` enum is legacy.

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { derivePresence, derivePresenceDevice } from "@/lib/presence";
import { toDate } from "@/lib/firestore-helpers";

type LeanUser = {
  _id: string;
  email?: string;
  username?: string;
  name?: string;
  lastSeen?: string | Date;
  presenceDevice?: string;
  customStatus?: string;
  activity?: string;
  stats?: { totalSolved?: number };
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export async function GET() {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs
      .map((doc: any) => {
        const { _id: _ignored, ...rest } = doc.data() as LeanUser;
        return { ...rest, _id: doc.id };
      })
      .map((u: any) => ({
        ...u,
        lastSeen: toDate(u.lastSeen) || undefined,
        createdAt: toDate(u.createdAt) || undefined,
        updatedAt: toDate(u.updatedAt) || undefined,
      }))
      .sort((a: any, b: any) => {
        const aLast = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const bLast = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        if (aLast !== bLast) return bLast - aLast;
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bCreated - aCreated;
      })
      .slice(0, 200);

    const decorated = users.map((u: any) => ({
      ...u,
      status: derivePresence(u.lastSeen || null),
      presenceDevice: derivePresenceDevice(u.presenceDevice),
      customStatus: u.customStatus || "",
    }));

    return NextResponse.json(decorated);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
