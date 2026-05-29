import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { toIso } from "@/lib/firestore-helpers";

export const runtime = "nodejs";

const EXPIRATIONS: Record<string, number | null> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  never: null,
};

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const conversationId = String(body?.conversationId || "");
    const creatorId = String(body?.creatorId || "");
    const creatorName = String(body?.creatorName || "");
    const question = String(body?.question || "").trim().slice(0, 240);
    const rawOptions = Array.isArray(body?.options) ? body.options : [];
    const labels = rawOptions
      .map((value: unknown) => String(value || "").trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 10);

    if (!conversationId || !creatorId || !question || labels.length < 2) {
      return NextResponse.json(
        { error: "Polls need a conversation, creator, question, and 2 options" },
        { status: 400 }
      );
    }

    const now = new Date();
    const duration = EXPIRATIONS[String(body?.expiration || "24h")] ?? null;
    const expiresAt = duration ? new Date(now.getTime() + duration) : null;
    const options = labels.map((label: string) => ({
      id: crypto.randomUUID(),
      label,
    }));

    const pollRef = await db.collection("polls").add({
      conversationId,
      question,
      options,
      votes: [],
      creatorId,
      creatorName,
      multipleChoice: Boolean(body?.multipleChoice),
      anonymous: Boolean(body?.anonymous),
      allowVoteChanges: body?.allowVoteChanges !== false,
      expiresAt,
      timeline: [{ at: now, totalVotes: 0 }],
      createdAt: now,
      updatedAt: now,
    });

    const messageRef = await db.collection("messages").add({
      conversation: conversationId,
      sender: creatorId,
      senderName: creatorName,
      body: `Poll: ${question}`,
      messageType: "poll",
      pollId: pollRef.id,
      createdAt: now,
      updatedAt: now,
      reactions: {},
      bookmarks: [],
      attachments: [],
    });

    await pollRef.set({ messageId: messageRef.id }, { merge: true });

    const pollSnap = await pollRef.get();
    const poll = serializePoll(pollRef.id, pollSnap.data() || {});
    return NextResponse.json({
      poll,
      message: {
        _id: messageRef.id,
        conversation: conversationId,
        sender: creatorId,
        senderName: creatorName,
        body: `Poll: ${question}`,
        messageType: "poll",
        pollId: pollRef.id,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        reactions: {},
        bookmarks: [],
        attachments: [],
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create poll";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
