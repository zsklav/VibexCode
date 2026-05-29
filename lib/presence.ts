// Derive rich presence from the heartbeat timestamp.
// This keeps the API and UI aligned on the same status windows.

export type PresenceStatus = "Active" | "Away" | "Offline";
export type PresenceDevice = "Desktop" | "Mobile";

const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const AWAY_WINDOW_MS = 5 * 60 * 1000;

export function derivePresence(lastSeen?: Date | string | null): PresenceStatus {
  if (!lastSeen) return "Offline";

  const ts =
    lastSeen instanceof Date ? lastSeen.getTime() : new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return "Offline";

  const age = Date.now() - ts;
  if (age < ACTIVE_WINDOW_MS) return "Active";
  if (age < AWAY_WINDOW_MS) return "Away";
  return "Offline";
}

export function derivePresenceDevice(value?: string | null): PresenceDevice {
  return value === "Mobile" ? "Mobile" : "Desktop";
}
