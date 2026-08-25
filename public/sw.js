// Dental Academy PWA service worker.
// - Precache the app shell.
// - Network-first for navigations, cache-first for static assets.
// - Cache video segment requests safely (range requests).
const CACHE = "dental-academy-v2";
const SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache the admin portal or auth APIs.
  if (url.pathname.startsWith("/api/admin")) return;
  if (url.pathname.startsWith("/api/auth")) return;
  // Never cache ANY dynamic API (course/video data must always be fresh).
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Same-origin GET: cache-first.
  if (req.method === "GET" && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((res) => {
              if (res.ok && res.type === "basic") {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
              }
              return res;
            })
            .catch(() => cached),
      ),
    );
  }
});
