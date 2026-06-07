// Push notification handler — imported into the generated service worker via importScripts.
// Runs in service worker context; no module imports allowed.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { title: "كسب", body: event.data.text() };
  }
  const title = payload.title || "كسب";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    data: payload.data || {},
    dir: "rtl",
    lang: "ar",
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
