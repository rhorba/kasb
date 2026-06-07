"use client";

import { useEffect } from "react";

// Silently re-registers an existing push subscription on page load.
// Fires only if permission is already 'granted' — never prompts the user.
export function PushSetup() {
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) return; // already subscribed

      try {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch {
        // Silently ignore — user can opt in from the profile page
      }
    });
  }, []);

  return null;
}
