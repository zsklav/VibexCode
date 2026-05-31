// Derive presence from a user's lastSeen timestamp.
// Single source of truth — both API and any client consumer should use this.

export type PresenceStatus = "Online" | "Idle" | "Offline";

// Heartbeat fires every 2 min — give a 1-min buffer before flipping to Idle.
const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const IDLE_WINDOW_MS = 10 * 60 * 1000;

export function derivePresence(lastSeen?: Date | string | null): PresenceStatus {
  if (!lastSeen) return "Offline";
  const ts =
    lastSeen instanceof Date ? lastSeen.getTime() : new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return "Offline";
  const age = Date.now() - ts;
  if (age < ONLINE_WINDOW_MS) return "Online";
  if (age < IDLE_WINDOW_MS) return "Idle";
  return "Offline";
}
