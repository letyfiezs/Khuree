"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 90_000;

export function PresenceHeartbeat() {
  useEffect(() => {
    let lastSentAt = 0;
    let authenticated = false;

    const send = () => {
      if (!authenticated || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastSentAt < 15_000) return;
      lastSentAt = now;
      void fetch("/api/account/presence", {
        method: "POST",
        cache: "no-store",
        keepalive: true,
      });
    };

    const authenticatedHandler = () => { authenticated = true; send(); };
    const timer = window.setInterval(send, HEARTBEAT_INTERVAL_MS);
    window.addEventListener("khuree-authenticated", authenticatedHandler);
    document.addEventListener("visibilitychange", send);
    window.addEventListener("focus", send);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("khuree-authenticated", authenticatedHandler);
      document.removeEventListener("visibilitychange", send);
      window.removeEventListener("focus", send);
    };
  }, []);

  return null;
}
