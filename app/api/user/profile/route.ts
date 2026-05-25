// GET   /api/user/profile?email=foo@bar.com  — fetch the editable profile + meta
// PATCH /api/user/profile                    — update bio/location/website/phone/username
//   body: { email, bio?, location?, website?, phone?, username? }
//
// SECURITY: email is client-supplied (no server-verified auth token yet).
// Same trust model as the rest of the app — see lib/auth.ts.

import { NextRequest, NextResponse } from "next/server";
import { db, FieldValue } from "@/lib/firebase-admin";
import { normalizeEmail, toDate } from "@/lib/firestore-helpers";

export const runtime = "nodejs";

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
        const email = normalizeEmail(searchParams.get("email"));

        if (!email) {
            return NextResponse.json(
                { success: false, error: "email is required" },
                { status: 400 }
            );
        }

        const snapshot = await db
            .collection("users")
            .where("email", "==", email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        const user = snapshot.docs[0].data();
        return NextResponse.json({
            success: true,
            profile: {
                email: user.email || email,
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
                createdAt: toDate(user.createdAt) || null,
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

        const users = db.collection("users");
        const snapshot = await users.where("email", "==", email).limit(1).get();
        if (snapshot.empty) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
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

        if (Object.keys(update).length === 0 && !body?.preferences) {
            return NextResponse.json(
                { success: false, error: "No editable fields provided" },
                { status: 400 }
            );
        }

        if (typeof update.username === "string") {
            const existing = await users
                .where("username", "==", update.username)
                .limit(1)
                .get();
            if (!existing.empty) {
                const existingEmail = existing.docs[0].data().email as string | undefined;
                if (existingEmail && existingEmail !== email) {
                    return NextResponse.json(
                        { success: false, error: "Username already taken" },
                        { status: 409 }
                    );
                }
            }
        }

        const userDoc = snapshot.docs[0];
        const current = userDoc.data() || {};

        const preferencesUpdate: Record<string, unknown> = {
            ...(typeof current.preferences === "object" && current.preferences
                ? current.preferences
                : {}),
        };

        if (body?.preferences && typeof body.preferences === "object") {
            const p = body.preferences as Record<string, unknown>;
            if (
                typeof p.defaultLanguage === "string" &&
                ["Javascript", "Python", "Java", "C++"].includes(p.defaultLanguage)
            ) {
                preferencesUpdate.defaultLanguage = p.defaultLanguage;
            }
            if (
                typeof p.theme === "string" &&
                ["light", "dark", "auto"].includes(p.theme)
            ) {
                preferencesUpdate.theme = p.theme;
            }
            if (typeof p.soundEnabled === "boolean") {
                preferencesUpdate.soundEnabled = p.soundEnabled;
            }
            if (typeof p.showDifficulty === "boolean") {
                preferencesUpdate.showDifficulty = p.showDifficulty;
            }
        }

        const payload = {
            ...update,
            preferences: preferencesUpdate,
            updatedAt: FieldValue.serverTimestamp(),
        };

        await userDoc.ref.set(payload, { merge: true });

        const updated = await userDoc.ref.get();
        return NextResponse.json({ success: true, profile: updated.data() });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to update profile";
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
