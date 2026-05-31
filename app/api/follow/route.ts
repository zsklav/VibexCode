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
import { followUser, unfollowUser, getFollowState } from "@/lib/follows";
import { normalizeEmail } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const follower = normalizeEmail(body?.followerEmail);
    const following = normalizeEmail(body?.followingEmail);

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

    const { alreadyFollowing } = await followUser(follower, following);
    return NextResponse.json({
      success: true,
      ...(alreadyFollowing ? { message: "Already following" } : {}),
    });
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
    const follower = normalizeEmail(body?.followerEmail);
    const following = normalizeEmail(body?.followingEmail);

    if (!follower || !following) {
      return NextResponse.json(
        { success: false, error: "followerEmail and followingEmail are required" },
        { status: 400 }
      );
    }

    await unfollowUser(follower, following);
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
    const userEmail = normalizeEmail(searchParams.get("userEmail"));

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "userEmail is required" },
        { status: 400 }
      );
    }

    const { followers, following } = await getFollowState(userEmail);
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
