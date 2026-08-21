// Minimal service worker for Phase 0/1: offline shell caching + push receipt.
// Expand cached routes as buyer/supplier screens are built in Phase 2.

const CACHE_NAME = "tradelink-shell-v1";
const SHELL_ROUTES = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ROUTES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first for API calls (data should never go stale silently),
// cache-first for the app shell (works offline on patchy connections).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/")) {
    return; // let API calls hit the network directly; no offline caching
            // of transaction/compliance data — staleness there is unsafe
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Web Push — fires on transaction state changes / compliance updates per
// Part 4.7 of the backend doc. Payload shape is decided when the push
// sending service (OneSignal or raw Web Push) is wired up in Phase 2.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Trade Platform";
  const options = {
    body: data.body || "You have an update.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
