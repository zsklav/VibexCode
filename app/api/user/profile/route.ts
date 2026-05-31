// GET   /api/user/profile?email=foo@bar.com  — fetch the editable profile + meta
// PATCH /api/user/profile                    — update bio/location/website/phone/username/preferences
//   body: { email, bio?, location?, website?, phone?, username?, preferences? }
//
// SECURITY: email is client-supplied (no server-verified auth token yet).
// Same trust model as the rest of the app — see lib/auth.ts.

import { NextRequest, NextResponse } from "next/server";
import {
  getUser,
  normalizeEmail,
  updateUserProfile,
  UsernameTakenError,
  FieldTooLongError,
} from "@/lib/users";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = normalizeEmail(searchParams.get("email"));

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    const user = await getUser(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        email: user.email,
        username: user.username || user.name || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        phone: user.phone || "",
        status: user.status || "Offline",
        stats: {
          totalSolved: user.stats?.totalSolved || 0,
          currentStreak: user.stats?.currentStreak || 0,
          longestStreak: user.stats?.longestStreak || 0,
        },
        preferences: {
          defaultLanguage: user.preferences?.defaultLanguage || "Javascript",
          theme: user.preferences?.theme || "auto",
          soundEnabled: user.preferences?.soundEnabled ?? true,
          showDifficulty: user.preferences?.showDifficulty ?? true,
        },
        createdAt: user.createdAt
          ? (user.createdAt as { toDate?: () => Date }).toDate?.() || null
          : null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch profile";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body?.email);

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    const updated = await updateUserProfile(email, body || {});
    return NextResponse.json({
      success: true,
      profile: {
        email: updated.email,
        username: updated.username,
        bio: updated.bio || "",
        location: updated.location || "",
        website: updated.website || "",
        phone: updated.phone || "",
      },
    });
  } catch (error) {
    if (error instanceof UsernameTakenError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    if (error instanceof FieldTooLongError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    const status =
      message === "No editable fields provided"
        ? 400
        : message === "User not found"
        ? 404
        : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
