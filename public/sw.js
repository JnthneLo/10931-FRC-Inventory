const CACHE = "inv-v1";
const SHELL = ["/", "/import", "/logo.png", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // API + mutations: network only (local server is the source of truth anyway)
  if (url.pathname.startsWith("/api/") || e.request.method !== "GET") return;
  // static assets: cache-first
  if (url.pathname.startsWith("/_next/") || url.pathname === "/logo.png") {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return r;
      }))
    );
    return;
  }
  // pages: network-first, fall back to cache when offline
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then((h) => h || caches.match("/"))));
});
