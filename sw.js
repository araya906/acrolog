// Offline app shell. Only same-origin files are cached; Instagram links and previews pass straight through.
// Bump VERSION whenever a file in SHELL changes.
const VERSION = "al-2026-11-18-2";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "src/app.js",
  "src/catalog.js",
  "src/stats.js",
  "src/photos.js",
  "src/media.js",
  "src/store.js",
  "src/i18n.js",
  "src/lang/en.js",
  "src/lang/es.js",
  "img/icon.svg",
  "img/icon-192.png",
  "img/icon-512.png",
  // PHOTOS:BEGIN
  "img/photos/front-bird-1.jpg",
  "img/photos/front-bird-2.jpg",
  "img/photos/front-bird-3.jpg",
  "img/photos/throne-1.jpg",
  "img/photos/throne-2.jpg",
  "img/photos/star-1.jpg",
  "img/photos/side-star-1.jpg",
  "img/photos/whale-1.jpg",
  "img/photos/floating-paschimo-1.jpg",
  "img/photos/hangle-dangle-1.jpg",
  "img/photos/super-yogi-1.jpg",
  "img/photos/backbend-1.jpg",
  "img/photos/backbend-2.jpg",
  "img/photos/chair-1.jpg",
  "img/photos/square-box-1.jpg",
  "img/photos/pyramid-1.jpg",
  "img/photos/handstand-on-thighs-1.jpg",
  "img/photos/trio-back-bird-1.jpg",
  "img/photos/trio-down-dog-1.jpg",
  // PHOTOS:END
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first, cache as offline fallback. ignoreSearch so a share-target launch (./?text=...) works offline.
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok && !new URL(req.url).search) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? cache.match("index.html") : Response.error());
  }
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(networkFirst(e.request));
});
