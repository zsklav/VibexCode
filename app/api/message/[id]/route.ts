import { NextRequest, NextResponse } from "next/server";
import { db, FieldValue, Timestamp } from "@/lib/firebase-admin";
import { detectAbuse } from "@/lib/moderation";
import { toDate } from "@/lib/firestore-helpers";

const WARNING_WINDOW_MS = 24 * 60 * 60 * 1000;
const BAN_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_WARNINGS = 3;

type ModerationWarning = {
  at?: Timestamp | Date | string;
};

type ModerationState = {
  warnings?: ModerationWarning[];
  chatBannedUntil?: Timestamp | Date | string;
};

type UserRecord = {
  email?: string;
  username?: string;
  firebaseUid?: string;
  moderation?: ModerationState;
};

async function resolveUser(senderId: string) {
  const users = db.collection("users");
  const byId = await users.doc(senderId).get();
  if (byId.exists) {
    return { ref: byId.ref, data: byId.data() as UserRecord };
  }

  const byUid = await users
    .where("firebaseUid", "==", senderId)
    .limit(1)
    .get();
  if (!byUid.empty) {
    const doc = byUid.docs[0];
    return { ref: doc.ref, data: doc.data() as UserRecord };
  }

  return null;
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { senderId, body: newBody } = await req.json();

    if (!senderId || !newBody) {
      return NextResponse.json(
        { error: "Missing required fields (senderId or body)" },
        { status: 400 }
      );
    }

    const userRecord = await resolveUser(senderId);
    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRecord.data;

    const now = new Date();
    const bannedUntil = user.moderation?.chatBannedUntil;
    const bannedUntilDate = toDate(bannedUntil);
    if (bannedUntilDate && bannedUntilDate > now) {
      return NextResponse.json(
        {
          error: "You are temporarily banned from chat.",
          bannedUntil: bannedUntilDate.toISOString(),
        },
        { status: 403 }
      );
    }

    const abuse = detectAbuse(String(newBody));
    if (abuse.hit) {
      const windowStart = new Date(now.getTime() - WARNING_WINDOW_MS);
      const warnings = user.moderation?.warnings || [];
      const recentWarnings = warnings.filter((w: ModerationWarning) => {
        const warningDate = toDate(w.at);
        return warningDate ? warningDate >= windowStart : false;
      });
      const warningCount = recentWarnings.length + 1;

      const warningRecord = {
        at: Timestamp.fromDate(now),
        reason: "abuse",
        conversationId: "edit",
        messagePreview: String(newBody).slice(0, 200),
      };

      const updatedWarnings = [...warnings, warningRecord].slice(-20);
      const moderationUpdate: ModerationState = {
        ...(user.moderation || {}),
        warnings: updatedWarnings,
      };

      if (warningCount >= MAX_WARNINGS) {
        const banUntil = new Date(now.getTime() + BAN_WINDOW_MS);
        moderationUpdate.chatBannedUntil = Timestamp.fromDate(banUntil);
        await userRecord.ref.set(
          { moderation: moderationUpdate },
          { merge: true }
        );
        return NextResponse.json(
          {
            error: "You have been temporarily banned from chat for 24 hours.",
            warnings: warningCount,
            bannedUntil: banUntil.toISOString(),
          },
          { status: 403 }
        );
      }

      await userRecord.ref.set(
        { moderation: moderationUpdate },
        { merge: true }
      );
      return NextResponse.json(
        {
          error: "Abusive language detected. This is a warning.",
          warnings: warningCount,
          remaining: MAX_WARNINGS - warningCount,
        },
        { status: 400 }
      );
    }

    const msgRef = db.collection("messages").doc(id);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const msgData = msgSnap.data() || {};
    if (msgData.sender !== senderId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await msgRef.set(
      { body: newBody, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

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
    const { id } = await context.params;

    const url = new URL(req.url);
    const senderId = url.searchParams.get("senderId");

    if (!senderId) {
      return NextResponse.json(
        { error: "Missing senderId in query parameters" },
        { status: 400 }
      );
    }

    const msgRef = db.collection("messages").doc(id);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const msgData = msgSnap.data() || {};
    if (msgData.sender !== senderId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await msgRef.delete();

    return NextResponse.json(
      { success: true, message: "Message deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/message/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { senderId, action, emoji } = await req.json();

    if (!senderId || !action) {
      return NextResponse.json(
        { error: "Missing required fields (senderId or action)" },
        { status: 400 }
      );
    }

    const msgRef = db.collection("messages").doc(id);
    const msgSnap = await msgRef.get();
    if (!msgSnap.exists) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const data = msgSnap.data() || {};

    if (action === "reaction") {
      const safeEmoji = String(emoji || "").slice(0, 8);
      if (!safeEmoji) {
        return NextResponse.json({ error: "emoji is required" }, { status: 400 });
      }

      const reactions = { ...(data.reactions || {}) } as Record<string, string[]>;
      const current = Array.isArray(reactions[safeEmoji])
        ? reactions[safeEmoji]
        : [];
      reactions[safeEmoji] = current.includes(senderId)
        ? current.filter((id) => id !== senderId)
        : [...current, senderId];

      if (reactions[safeEmoji].length === 0) delete reactions[safeEmoji];

      await msgRef.set(
        { reactions, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return NextResponse.json({ success: true, reactions });
    }

    if (action === "bookmark") {
      const bookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];
      const nextBookmarks = bookmarks.includes(senderId)
        ? bookmarks.filter((id: string) => id !== senderId)
        : [...bookmarks, senderId];

      await msgRef.set(
        { bookmarks: nextBookmarks, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return NextResponse.json({ success: true, bookmarks: nextBookmarks });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/message/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
