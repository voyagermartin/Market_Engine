// Service Worker for Market Engine PWA
const CACHE_NAME = 'market-engine-pwa-v2';

const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './favicon.png',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// Install: pre-cache static assets with resilient error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[PWA SW] Pre-cache asset warning for ' + asset + ':', err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: smart caching strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Live market data APIs (GAS API / JSONP) -> Network only (page has SWR localStorage)
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com') || url.search.includes('callback=')) {
    return;
  }

  // 2. Navigation requests (HTML page) -> Stale-While-Revalidate with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match(req);
        })
    );
    return;
  }

  // 3. Static assets & Google Fonts -> Cache-first with background revalidate
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) {
        fetch(req).then((freshRes) => {
          if (freshRes && freshRes.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, freshRes));
          }
        }).catch(() => {});
        return cachedRes;
      }

      return fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200 && (url.origin === self.location.origin || url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com'))) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      });
    })
  );
});
