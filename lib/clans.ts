// Firestore-backed clans + memberships.
//
// Schema:
//   clans/{autoId} = { name, tag, ownerEmail, createdAt, updatedAt }
//   clans/{clanId}/members/{email} = { email, clanId, joinedAt }   — subcollection
//
// Membership is a subcollection so "list members of clan X" is a single
// collection read and "remove all members of X" is a batched delete on a
// known path. A user's current clan is found by the doc-id lookup pattern
// below — we maintain a denormalized `userClans/{email} = { clanId }` doc
// to make "is this user in a clan" a single read instead of a collection
// group scan.

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

export type Clan = {
  $id: string;
  name: string;
  tag: string;
  ownerEmail: string;
  memberCount: number;
};

function tsToIso(ts: Timestamp | undefined): string {
  return ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
}

async function countMembers(clanId: string): Promise<number> {
  const db = adminDb();
  const snap = await db
    .collection("clans")
    .doc(clanId)
    .collection("members")
    .count()
    .get();
  return snap.data().count;
}

export async function getClan(clanId: string): Promise<Clan | null> {
  const db = adminDb();
  const snap = await db.collection("clans").doc(clanId).get();
  if (!snap.exists) return null;
  const data = snap.data() as FirebaseFirestore.DocumentData;
  const memberCount = await countMembers(clanId);
  return {
    $id: snap.id,
    name: data.name,
    tag: data.tag,
    ownerEmail: data.ownerEmail,
    memberCount,
  };
}

export async function getUserClan(email: string): Promise<Clan | null> {
  const db = adminDb();
  const e = email.toLowerCase();
  const ptrSnap = await db.collection("userClans").doc(e).get();
  if (!ptrSnap.exists) return null;
  const clanId = (ptrSnap.data() as FirebaseFirestore.DocumentData).clanId as string;
  if (!clanId) return null;

  const clan = await getClan(clanId);
  if (!clan) {
    // Stale pointer — clean up.
    await db.collection("userClans").doc(e).delete().catch(() => {});
    return null;
  }
  return clan;
}

export class AlreadyInClanError extends Error {
  constructor() {
    super("User is already in a clan");
    this.name = "AlreadyInClanError";
  }
}

export class ClanNotFoundError extends Error {
  constructor() {
    super("Clan not found");
    this.name = "ClanNotFoundError";
  }
}

export async function createClan(input: {
  email: string;
  name: string;
}): Promise<Clan> {
  const db = adminDb();
  const email = input.email.toLowerCase();
  const name = input.name.trim();
  if (!name) throw new Error("name is required");
  const tag = name.substring(0, 4).toUpperCase();

  const clanRef = db.collection("clans").doc();
  const ptrRef = db.collection("userClans").doc(email);
  const memberRef = clanRef.collection("members").doc(email);

  await db.runTransaction(async (tx) => {
    const ptrSnap = await tx.get(ptrRef);
    if (ptrSnap.exists) throw new AlreadyInClanError();

    tx.set(clanRef, {
      name,
      tag,
      ownerEmail: email,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(memberRef, {
      email,
      clanId: clanRef.id,
      joinedAt: FieldValue.serverTimestamp(),
    });
    tx.set(ptrRef, { clanId: clanRef.id });
  });

  return {
    $id: clanRef.id,
    name,
    tag,
    ownerEmail: email,
    memberCount: 1,
  };
}

export async function joinClan(email: string, clanId: string): Promise<void> {
  const db = adminDb();
  const e = email.toLowerCase();
  const clanRef = db.collection("clans").doc(clanId);
  const ptrRef = db.collection("userClans").doc(e);
  const memberRef = clanRef.collection("members").doc(e);

  await db.runTransaction(async (tx) => {
    const [clanSnap, ptrSnap] = await Promise.all([
      tx.get(clanRef),
      tx.get(ptrRef),
    ]);
    if (!clanSnap.exists) throw new ClanNotFoundError();
    if (ptrSnap.exists) throw new AlreadyInClanError();

    tx.set(memberRef, {
      email: e,
      clanId,
      joinedAt: FieldValue.serverTimestamp(),
    });
    tx.set(ptrRef, { clanId });
  });
}

export class NotInClanError extends Error {
  constructor() {
    super("User is not in a clan");
    this.name = "NotInClanError";
  }
}

/**
 * Removes the user from their clan. If they were the owner, promotes the
 * oldest remaining member to owner; if no members remain, deletes the clan.
 */
export async function leaveClan(email: string): Promise<void> {
  const db = adminDb();
  const e = email.toLowerCase();
  const ptrRef = db.collection("userClans").doc(e);
  const ptrSnap = await ptrRef.get();
  if (!ptrSnap.exists) throw new NotInClanError();
  const clanId = (ptrSnap.data() as FirebaseFirestore.DocumentData).clanId as string;

  const clanRef = db.collection("clans").doc(clanId);
  const memberRef = clanRef.collection("members").doc(e);

  const clanSnap = await clanRef.get();
  if (!clanSnap.exists) {
    // Stale pointer.
    await Promise.all([memberRef.delete(), ptrRef.delete()]).catch(() => {});
    return;
  }
  const clan = clanSnap.data() as FirebaseFirestore.DocumentData;
  const wasOwner = clan.ownerEmail === e;

  // Delete this member + pointer atomically.
  const batch = db.batch();
  batch.delete(memberRef);
  batch.delete(ptrRef);
  await batch.commit();

  if (!wasOwner) return;

  // Owner left — promote oldest remaining member or delete clan.
  const remaining = await clanRef
    .collection("members")
    .orderBy("joinedAt", "asc")
    .limit(1)
    .get();
  if (remaining.empty) {
    await clanRef.delete();
  } else {
    const newOwnerEmail = remaining.docs[0].data().email as string;
    await clanRef.update({
      ownerEmail: newOwnerEmail,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

export class NotOwnerError extends Error {
  constructor() {
    super("Only the clan owner can kick members");
    this.name = "NotOwnerError";
  }
}

export class CannotKickSelfError extends Error {
  constructor() {
    super("The owner cannot kick themselves");
    this.name = "CannotKickSelfError";
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super("User is not a member of this clan");
    this.name = "MemberNotFoundError";
  }
}

export async function kickMember(input: {
  clanId: string;
  ownerEmail: string;
  memberEmail: string;
}): Promise<void> {
  const db = adminDb();
  const owner = input.ownerEmail.toLowerCase();
  const target = input.memberEmail.toLowerCase();

  const clanRef = db.collection("clans").doc(input.clanId);
  const memberRef = clanRef.collection("members").doc(target);
  const ptrRef = db.collection("userClans").doc(target);

  await db.runTransaction(async (tx) => {
    const clanSnap = await tx.get(clanRef);
    if (!clanSnap.exists) throw new ClanNotFoundError();
    const clan = clanSnap.data() as FirebaseFirestore.DocumentData;
    if (clan.ownerEmail !== owner) throw new NotOwnerError();
    if (target === owner) throw new CannotKickSelfError();

    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) throw new MemberNotFoundError();

    tx.delete(memberRef);
    tx.delete(ptrRef);
  });
}

export { tsToIso };
