// POST   /api/follow                            — follow a user
//   body: { followerEmail, followingEmail }
// DELETE /api/follow                            — unfollow a user
//   body: { followerEmail, followingEmail }
// GET    /api/follow?userEmail=foo@bar.com      — list a user's followers + following
//   returns: { followers: string[], following: string[], counts: { followers, following } }
//
// SECURITY: see lib/auth.ts. followerEmail is client-supplied and could
// be spoofed until we add server-verified auth tokens.

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Follows from "@/models/Follows";

export const runtime = "nodejs";

function normalize(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const v = email.trim().toLowerCase();
  return v.length > 0 ? v : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const follower = normalize(body?.followerEmail);
    const following = normalize(body?.followingEmail);

    if (!follower || !following) {
      return NextResponse.json(
        { success: false, error: "followerEmail and followingEmail are required" },
        { status: 400 }
      );
    }
    if (follower === following) {
      return NextResponse.json(
        { success: false, error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    await connectDB();

    // Idempotent: re-following returns 200 instead of 409.
    try {
      await Follows.create({
        followerEmail: follower,
        followingEmail: following,
      });
    } catch (e) {
      const code = (e as { code?: number })?.code;
      if (code === 11000) {
        return NextResponse.json({
          success: true,
          message: "Already following",
        });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to follow";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const follower = normalize(body?.followerEmail);
    const following = normalize(body?.followingEmail);

    if (!follower || !following) {
      return NextResponse.json(
        { success: false, error: "followerEmail and followingEmail are required" },
        { status: 400 }
      );
    }

    await connectDB();
    await Follows.deleteOne({
      followerEmail: follower,
      followingEmail: following,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to unfollow";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = normalize(searchParams.get("userEmail"));

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "userEmail is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const [followersDocs, followingDocs] = await Promise.all([
      Follows.find({ followingEmail: userEmail })
        .select("followerEmail -_id")
        .lean<Array<{ followerEmail: string }>>(),
      Follows.find({ followerEmail: userEmail })
        .select("followingEmail -_id")
        .lean<Array<{ followingEmail: string }>>(),
    ]);

    const followers = followersDocs.map((d) => d.followerEmail);
    const following = followingDocs.map((d) => d.followingEmail);

    return NextResponse.json({
      success: true,
      followers,
      following,
      counts: {
        followers: followers.length,
        following: following.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch follows";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
