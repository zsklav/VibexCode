// Asymmetric follow relationships.
//
// Doc id = `${follower}__${following}` so the pair is unique by construction
// — no compound unique index needed (Firestore doesn't have one anyway).

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

function followId(follower: string, following: string): string {
  return `${follower}__${following}`;
}

export async function followUser(
  follower: string,
  following: string
): Promise<{ alreadyFollowing: boolean }> {
  const db = adminDb();
  const ref = db.collection("follows").doc(followId(follower, following));
  const snap = await ref.get();
  if (snap.exists) return { alreadyFollowing: true };

  await ref.set({
    followerEmail: follower,
    followingEmail: following,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { alreadyFollowing: false };
}

export async function unfollowUser(
  follower: string,
  following: string
): Promise<void> {
  const db = adminDb();
  await db.collection("follows").doc(followId(follower, following)).delete();
}

export async function getFollowState(userEmail: string): Promise<{
  followers: string[];
  following: string[];
}> {
  const db = adminDb();
  const [followersSnap, followingSnap] = await Promise.all([
    db.collection("follows").where("followingEmail", "==", userEmail).get(),
    db.collection("follows").where("followerEmail", "==", userEmail).get(),
  ]);
  return {
    followers: followersSnap.docs.map((d) => d.data().followerEmail as string),
    following: followingSnap.docs.map((d) => d.data().followingEmail as string),
  };
}
