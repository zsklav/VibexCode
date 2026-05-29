import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { toIso } from "@/lib/firestore-helpers";

export const runtime = "nodejs";

const THEMES = new Set([
  "default",
  "ocean",
  "aurora",
  "purple-night",
  "sunset",
  "cyber",
  "emerald",
]);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || "";
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const snap = await db.collection("userThemes").doc(userId).get();
  if (!snap.exists) {
    return NextResponse.json({ userId, theme: "default" });
  }

  const data = snap.data() || {};
  return NextResponse.json({
    userId,
    theme: data.theme || "default",
    updatedAt: toIso(data.updatedAt),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body?.userId || "");
  const theme = String(body?.theme || "default");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!THEMES.has(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  await db.collection("userThemes").doc(userId).set(
    {
      userId,
      theme,
      updatedAt: new Date(),
      createdAt: new Date(),
    },
    { merge: true }
  );

  return NextResponse.json({
    userId,
    theme,
    updatedAt: new Date().toISOString(),
  });
}
