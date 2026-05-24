/**
 * Admin gating helper.
 *
 * SECURITY CAVEAT: This relies on the client sending its own email in the
 * request body. A motivated attacker can spoof another user's email by
 * sending any value they like. This is a UX gate, not a security gate.
 *
 * Real protection requires server-side verification of an auth token
 * (Firebase Admin SDK verifyIdToken, or Appwrite server session). When
 * that's in place, this helper stays — just the inputs change from
 * client-supplied email to server-verified email.
 *
 * We use NEXT_PUBLIC_ADMIN_EMAILS so the same allowlist is readable both
 * server-side (API routes) and client-side (page-level UX gating).
 */

export function getAdminEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
