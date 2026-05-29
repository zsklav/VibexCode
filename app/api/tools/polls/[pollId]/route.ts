import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { toIso } from "@/lib/firestore-helpers";

export const runtime = "nodejs";

function serializePoll(id: string, data: any) {
  return {
    _id: id,
    ...data,
    expiresAt: toIso(data.expiresAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    timeline: (data.timeline || []).map((entry: any) => ({
      ...entry,
      at: toIso(entry.at) || entry.at,
    })),
  };
}

function isClosed(data: any) {
  if (!data?.expiresAt) return false;
  const expiresAt =
    data.expiresAt instanceof Date
      ? data.expiresAt
      : typeof data.expiresAt?.toDate === "function"
        ? data.expiresAt.toDate()
        : new Date(data.expiresAt);
  return expiresAt.getTime() <= Date.now();
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ pollId: string }> }
) {
  const { pollId } = await context.params;
  const snap = await db.collection("polls").doc(pollId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
  return NextResponse.json(serializePoll(snap.id, snap.data() || {}));
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ pollId: string }> }
) {
  try {
    const { pollId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "");
    const optionIds = Array.isArray(body?.optionIds)
      ? body.optionIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];

    if (!userId || optionIds.length === 0) {
      return NextResponse.json(
        { error: "userId and optionIds are required" },
        { status: 400 }
      );
    }

    const ref = db.collection("polls").doc(pollId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const data = snap.data() || {};
    if (isClosed(data)) {
      return NextResponse.json({ error: "Poll is closed" }, { status: 403 });
    }

    const allowed = new Set((data.options || []).map((option: any) => option.id));
    const nextOptionIds = optionIds
      .filter((id: string) => allowed.has(id))
      .slice(0, data.multipleChoice ? 10 : 1);

    if (nextOptionIds.length === 0) {
      return NextResponse.json({ error: "Invalid option" }, { status: 400 });
    }

    const votes = Array.isArray(data.votes) ? [...data.votes] : [];
    const existingIndex = votes.findIndex((vote: any) => vote.userId === userId);
    if (existingIndex >= 0 && data.allowVoteChanges === false) {
      return NextResponse.json(
        { error: "Vote changes are disabled" },
        { status: 403 }
      );
    }

    const vote = { userId, optionIds: nextOptionIds, votedAt: new Date() };
    if (existingIndex >= 0) votes[existingIndex] = vote;
    else votes.push(vote);

    const timeline = Array.isArray(data.timeline) ? data.timeline : [];
    const nextTimeline = [
      ...timeline,
      { at: new Date(), totalVotes: votes.length },
    ].slice(-200);

    await ref.set(
      { votes, timeline: nextTimeline, updatedAt: new Date() },
      { merge: true }
    );

    const updated = await ref.get();
    return NextResponse.json(serializePoll(updated.id, updated.data() || {}));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to vote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
