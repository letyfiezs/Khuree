const CACHE_VERSION = "khuree-pwa-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("khuree-pwa-") && key !== CACHE_VERSION).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

// Streaming, account and admin requests deliberately stay network-only.
self.addEventListener("fetch", () => {});
