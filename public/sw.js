// Service worker: network-first pages (with offline fallback) + push receipt.
// Bump CACHE_NAME whenever the caching behaviour changes.

const CACHE_NAME = "nexum-shell-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

// Pages: network first, so deploys show up immediately; cached copy only when offline.
// Everything else (JS, CSS, images, API) goes straight to the network/browser cache.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (request.mode !== "navigate") return;
  // Signed-in and auth pages are never cached: a cached copy could show one
  // person's dashboard to the next person on a shared device.
  if (/^\/(dashboard|login|signup|auth)(\/|$)/.test(url.pathname)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});

// Web Push — fires on transaction state changes / compliance updates per
// Part 4.7 of the backend doc. Payload shape is decided when the push
// sending service (OneSignal or raw Web Push) is wired up in Phase 2.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Nexum";
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
