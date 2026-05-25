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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    await connectDB();
    const { conversationId } = await context.params; // await here

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 });

    return NextResponse.json(messages, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> } // params is a Promise here too
) {
  try {
    await connectDB();
    const { conversationId } = await context.params; // <-- await added

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const body = await req.json();
    const { senderId, senderName, senderEmail, body: messageBody, image } = body;

    if (!senderId || !messageBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userLookup: Array<Record<string, string>> = [
      { firebaseUid: senderId },
      { appwriteId: senderId },
    ];
    if (isValidObjectId(senderId)) {
      userLookup.push({ _id: senderId });
    }

    let user = await Users.findOne({ $or: userLookup }).select("moderation");

    if (!user && typeof senderEmail === "string" && senderEmail.trim()) {
      const normalizedEmail = senderEmail.trim().toLowerCase();
      const existingByEmail = await Users.findOne({ email: normalizedEmail });
      if (existingByEmail) {
        if (!existingByEmail.firebaseUid) {
          existingByEmail.firebaseUid = senderId;
          await existingByEmail.save();
        }
        user = existingByEmail;
      } else {
        const baseUsername =
          typeof senderName === "string" && senderName.trim()
            ? senderName.trim()
            : normalizedEmail.split("@")[0];
        try {
          user = await Users.create({
            email: normalizedEmail,
            username: baseUsername,
            firebaseUid: senderId,
          });
        } catch (createError) {
          console.warn("Failed to auto-create user for chat:", createError);
        }
      }
    }

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

    const abuse = detectAbuse(String(messageBody));
    if (abuse.hit) {
      const windowStart = new Date(now.getTime() - WARNING_WINDOW_MS);
      const recentWarnings = (user.moderation?.warnings || []).filter(
        (w: ModerationWarning) => w.at && w.at >= windowStart
      );
      const warningCount = recentWarnings.length + 1;

      const warningRecord = {
        at: now,
        reason: "abuse",
        conversationId,
        messagePreview: String(messageBody).slice(0, 200),
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

    const newMessage = new Message({
      conversation: conversationId,
      sender: senderId,
      senderName,
      body: messageBody,
      image,
    });

    await newMessage.save();

    return NextResponse.json(newMessage, { status: 201 });
  } catch (err) {
    console.error("❌ Error saving message:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


