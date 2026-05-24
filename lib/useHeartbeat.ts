"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 s

// Pings /api/user/heartbeat while the tab is visible so server-side
// derivePresence() can report this user as Online. Pauses on hidden tabs
// so a background tab doesn't pretend the user is here.
export function useHeartbeat(email: string | null | undefined) {
  useEffect(() => {
    if (!email) return;
    const target = email.trim().toLowerCase();
    if (!target) return;

    let cancelled = false;

    const ping = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible")
        return;
      // Use keepalive so the request survives a tab-close race.
      fetch("/api/user/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
        keepalive: true,
      }).catch(() => {
        // Network blip — next interval will retry.
      });
    };

    // Immediate ping on mount so the user appears Online without waiting
    // a full interval.
    ping();
    const id = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    // Ping again when the tab regains focus — covers the "came back after
    // 20 min" case without waiting for the next scheduled tick.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [email]);
}
