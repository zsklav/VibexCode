// PUT    /api/message/[id]?senderId=<uid>  — edit body. Reruns moderation.
//   Body: { senderId, body }
// DELETE /api/message/[id]?senderId=<uid>  — delete own message.

import { NextRequest, NextResponse } from "next/server";
import {
  deleteMessage,
  updateMessageBody,
  moderateMessage,
} from "@/lib/messages";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { senderId, body: newBody, senderEmail, senderName } = await req.json();

    if (!senderId || !newBody) {
      return NextResponse.json(
        { error: "Missing required fields (senderId or body)" },
        { status: 400 }
      );
    }

    const moderation = await moderateMessage({
      senderId,
      senderEmail,
      senderName,
      body: String(newBody),
      conversationId: "edit",
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

    try {
      const updated = await updateMessageBody(id, senderId, String(newBody));
      if (!updated) {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: true, message: "Message updated successfully" },
        { status: 200 }
      );
    } catch (e) {
      if (e instanceof Error && e.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      throw e;
    }
  } catch (error) {
    console.error("PUT /api/message/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);
    const senderId = url.searchParams.get("senderId");

    if (!senderId) {
      return NextResponse.json(
        { error: "Missing senderId in query parameters" },
        { status: 400 }
      );
    }

    const result = await deleteMessage(id, senderId);
    if (result === false) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }
    if (result === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json(
      { success: true, message: "Message deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/message/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
