// GET   /api/user/profile?email=foo@bar.com  — fetch the editable profile + meta
// PATCH /api/user/profile                    — update bio/location/website/phone/username
//   body: { email, bio?, location?, website?, phone?, username? }
//
// SECURITY: email is client-supplied (no server-verified auth token yet).
// Same trust model as the rest of the app — see lib/auth.ts.

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Users from "@/models/Users";

export const runtime = "nodejs";

function normalize(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const v = email.trim().toLowerCase();
  return v.length > 0 ? v : null;
}

// Whitelist of fields PATCH is allowed to touch. Anything else is dropped.
const EDITABLE_FIELDS = ["bio", "location", "website", "phone", "username"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

const MAX_LENGTHS: Record<EditableField, number> = {
  bio: 280,
  location: 100,
  website: 200,
  phone: 30,
  username: 50,
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = normalize(searchParams.get("email"));

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await Users.findOne({ email })
      .select(
        "email username name bio location website phone status stats preferences createdAt"
      )
      .lean<{
        email: string;
        username?: string;
        name?: string;
        bio?: string;
        location?: string;
        website?: string;
        phone?: string;
        status?: string;
        stats?: {
          totalSolved?: number;
          currentStreak?: number;
          longestStreak?: number;
        };
        preferences?: {
          defaultLanguage?: string;
          theme?: string;
          soundEnabled?: boolean;
          showDifficulty?: boolean;
        };
        createdAt?: Date;
      }>();

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
        createdAt: user.createdAt || null,
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
    const email = normalize(body?.email);

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    // Collect only whitelisted fields. Empty strings are allowed (clears value).
    const update: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = body?.[field];
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed.length > MAX_LENGTHS[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `${field} must be ${MAX_LENGTHS[field]} characters or fewer`,
          },
          { status: 400 }
        );
      }
      update[field] = trimmed;
    }

    // Preferences sub-object — each key validated individually so a bad
    // value in one field doesn't reject the whole patch.
    if (body?.preferences && typeof body.preferences === "object") {
      const p = body.preferences as Record<string, unknown>;
      if (
        typeof p.defaultLanguage === "string" &&
        ["Javascript", "Python", "Java", "C++"].includes(p.defaultLanguage)
      ) {
        update["preferences.defaultLanguage"] = p.defaultLanguage;
      }
      if (
        typeof p.theme === "string" &&
        ["light", "dark", "auto"].includes(p.theme)
      ) {
        update["preferences.theme"] = p.theme;
      }
      if (typeof p.soundEnabled === "boolean") {
        update["preferences.soundEnabled"] = p.soundEnabled;
      }
      if (typeof p.showDifficulty === "boolean") {
        update["preferences.showDifficulty"] = p.showDifficulty;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: "No editable fields provided" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await Users.findOneAndUpdate(
      { email },
      { $set: update },
      { new: true }
    )
      .select("email username bio location website phone")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, profile: user });
  } catch (error) {
    // Duplicate-username collision surfaces as a Mongo 11000 error.
    const e = error as { code?: number; message?: string };
    if (e?.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Username already taken" },
        { status: 409 }
      );
    }
    const message = e?.message || "Failed to update profile";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
