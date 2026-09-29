const CACHE_NAME = "resqtrack-v2";
const ASSETS_TO_CACHE = [
  "/driver",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isDriverOfflineNavigation = request.mode === "navigate" && url.pathname === "/driver";

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Let Next.js handle page, API, and RSC requests without stale cache fallbacks.
  if (
    (request.mode === "navigate" && !isDriverOfflineNavigation) ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    request.headers.has("RSC") ||
    request.headers.has("Next-Router-State-Tree") ||
    request.headers.has("Next-Router-Prefetch") ||
    url.searchParams.has("_rsc")
  ) return;

  if (isDriverOfflineNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  if (!/\.(?:png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf)$|\/manifest\.json$/i.test(url.pathname)) return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse?.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
