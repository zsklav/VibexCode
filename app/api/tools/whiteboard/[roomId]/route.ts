import { NextRequest, NextResponse } from "next/server";
import { db, FieldValue } from "@/lib/firebase-admin";
import { toIso } from "@/lib/firestore-helpers";

export const runtime = "nodejs";

type BoardElement = {
  id: string;
  type: string;
  tool?: string;
  points?: number[][];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  strokeWidth?: number;
  fontSize?: number;
};

function sanitizeElements(input: unknown): BoardElement[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 2000).map((item: any) => ({
    id: String(item?.id || crypto.randomUUID()),
    type: String(item?.type || "path").slice(0, 24),
    tool: String(item?.tool || "").slice(0, 24),
    points: Array.isArray(item?.points)
      ? item.points.slice(0, 4000).map((point: any) => [
          Number(point?.[0] || 0),
          Number(point?.[1] || 0),
        ])
      : [],
    x: Number(item?.x || 0),
    y: Number(item?.y || 0),
    width: Number(item?.width || 0),
    height: Number(item?.height || 0),
    text: String(item?.text || "").slice(0, 2000),
    color: String(item?.color || "#111827").slice(0, 24),
    strokeWidth: Number(item?.strokeWidth || 3),
    fontSize: Number(item?.fontSize || 18),
  }));
}

function serializeBoard(id: string, data: any) {
  return {
    _id: id,
    roomId: data.roomId,
    elements: data.elements || [],
    participants: data.participants || [],
    history: (data.history || []).map((entry: any) => ({
      ...entry,
      savedAt: toIso(entry.savedAt) || entry.savedAt || null,
    })),
    metadata: data.metadata || {},
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  const ref = db.collection("whiteboards").doc(roomId);
  const snap = await ref.get();
  if (!snap.exists) {
    const payload = {
      roomId,
      elements: [],
      participants: [],
      history: [],
      metadata: {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(payload);
    return NextResponse.json(serializeBoard(roomId, payload));
  }

  return NextResponse.json(serializeBoard(snap.id, snap.data() || {}));
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const elements = sanitizeElements(body?.elements);
  const savedBy =
    typeof body?.savedBy === "string" ? body.savedBy.slice(0, 120) : "unknown";

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  const ref = db.collection("whiteboards").doc(roomId);
  const snap = await ref.get();
  const current = snap.exists ? snap.data() || {} : {};
  const history = Array.isArray(current.history) ? current.history : [];
  const nextHistory = [
    ...history,
    { elements, savedBy, savedAt: new Date().toISOString() },
  ].slice(-20);

  await ref.set(
    {
      roomId,
      elements,
      history: nextHistory,
      metadata: {
        ...(current.metadata || {}),
        lastSavedBy: savedBy,
        elementCount: elements.length,
      },
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: current.createdAt || FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const saved = await ref.get();
  return NextResponse.json(serializeBoard(saved.id, saved.data() || {}));
}
