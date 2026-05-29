import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { toIso } from "@/lib/firestore-helpers";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const snapshot = await db
      .collection("messages")
      .where("bookmarks", "array-contains", userId)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const messages = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        _id: doc.id,
        ...data,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
        ghostExpiresAt: toIso(data.ghostExpiresAt),
      };
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("GET /api/bookmarks/[userId] error:", error);
    return NextResponse.json(
      { error: "Failed to load bookmarks" },
      { status: 500 }
    );
  }
}
