const CACHE_VERSION = "khuree-pwa-v3";
const APP_ASSETS = [
  "/manifest.webmanifest",
  "/pwa/icon-192.png?v=2",
  "/pwa/icon-512.png?v=2",
  "/pwa/apple-touch-icon.png?v=2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("khuree-pwa-") && key !== CACHE_VERSION).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

// Cache only public PWA assets and immutable Next.js bundles. Streaming,
// account, payment, and admin requests deliberately stay network-only.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const cacheable = url.pathname.startsWith("/pwa/")
    || url.pathname === "/manifest.webmanifest"
    || url.pathname.startsWith("/_next/static/");
  if (!cacheable) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, response.clone()));
      return response;
    })),
  );
});
