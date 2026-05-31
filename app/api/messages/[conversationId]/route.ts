// GET  /api/messages/[conversationId]   — list all messages in a conversation
// POST /api/messages/[conversationId]   — send a message (runs moderation)
//   Body: { senderId, senderName, senderEmail, body, image }

import { NextRequest, NextResponse } from "next/server";
import { listMessages, createMessage, moderateMessage } from "@/lib/messages";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId" },
        { status: 400 }
      );
    }
    const messages = await listMessages(conversationId);
    return NextResponse.json(messages, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      senderId,
      senderName,
      senderEmail,
      body: messageBody,
      image,
    } = body;

    if (!senderId || !messageBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const moderation = await moderateMessage({
      senderId,
      senderEmail,
      senderName,
      body: String(messageBody),
      conversationId,
    });

    switch (moderation.kind) {
      case "no-user":
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      case "banned":
        return NextResponse.json(
          {
            error: "You are temporarily banned from chat.",
            bannedUntil: moderation.bannedUntil,
          },
          { status: 403 }
        );
      case "newly-banned":
        return NextResponse.json(
          {
            error: "You have been temporarily banned from chat for 24 hours.",
            warnings: moderation.warnings,
            bannedUntil: moderation.bannedUntil,
          },
          { status: 403 }
        );
      case "warned":
        return NextResponse.json(
          {
            error: "Abusive language detected. This is a warning.",
            warnings: moderation.warnings,
            remaining: moderation.remaining,
          },
          { status: 400 }
        );
    }

    const created = await createMessage({
      conversationId,
      senderId,
      senderName,
      body: String(messageBody),
      image,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("❌ Error saving message:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
