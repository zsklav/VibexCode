import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Messages";
import Users from "@/models/Users";
import { isValidObjectId } from "mongoose";
import { detectAbuse } from "@/lib/moderation";

const WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;
const BAN_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_WARNINGS = 3;

type ModerationWarning = {
  at?: Date;
};

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;

    const { senderId, body: newBody } = await req.json();

    if (!senderId || !newBody) {
      return NextResponse.json(
        { error: "Missing required fields (senderId or body)" },
        { status: 400 }
      );
    }

    const userLookup: Array<Record<string, string>> = [
      { firebaseUid: senderId },
      { appwriteId: senderId },
    ];
    if (isValidObjectId(senderId)) {
      userLookup.push({ _id: senderId });
    }

    const user = await Users.findOne({ $or: userLookup }).select("moderation");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const bannedUntil = user.moderation?.chatBannedUntil;
    if (bannedUntil && bannedUntil > now) {
      return NextResponse.json(
        {
          error: "You are temporarily banned from chat.",
          bannedUntil: bannedUntil.toISOString(),
        },
        { status: 403 }
      );
    }

    const abuse = detectAbuse(String(newBody));
    if (abuse.hit) {
      const windowStart = new Date(now.getTime() - WARNING_WINDOW_MS);
      const recentWarnings = (user.moderation?.warnings || []).filter(
        (w: ModerationWarning) => w.at && w.at >= windowStart
      );
      const warningCount = recentWarnings.length + 1;

      const warningRecord = {
        at: now,
        reason: "abuse",
        conversationId: "edit",
        messagePreview: String(newBody).slice(0, 200),
      };

      const update: Record<string, unknown> = {
        $push: {
          "moderation.warnings": { $each: [warningRecord], $slice: -20 },
        },
      };

      if (warningCount >= MAX_WARNINGS) {
        const banUntil = new Date(now.getTime() + BAN_WINDOW_MS);
        update.$set = { "moderation.chatBannedUntil": banUntil };
        await Users.updateOne({ _id: user._id }, update);
        return NextResponse.json(
          {
            error: "You have been temporarily banned from chat for 24 hours.",
            warnings: warningCount,
            bannedUntil: banUntil.toISOString(),
          },
          { status: 403 }
        );
      }

      await Users.updateOne({ _id: user._id }, update);
      return NextResponse.json(
        {
          error: "Abusive language detected. This is a warning.",
          warnings: warningCount,
          remaining: MAX_WARNINGS - warningCount,
        },
        { status: 400 }
      );
    }

    const msgToUpdate = await Message.findById(id);
    if (!msgToUpdate) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (msgToUpdate.sender.toString() !== senderId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    msgToUpdate.body = newBody;
    await msgToUpdate.save();

    return NextResponse.json(
      { success: true, message: "Message updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/message/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await context.params;

    const url = new URL(req.url);
    const senderId = url.searchParams.get("senderId");

    if (!senderId) {
      return NextResponse.json(
        { error: "Missing senderId in query parameters" },
        { status: 400 }
      );
    }

    const msgToDelete = await Message.findById(id);
    if (!msgToDelete) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (msgToDelete.sender.toString() !== senderId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await msgToDelete.deleteOne();

    return NextResponse.json(
      { success: true, message: "Message deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/message/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
