// Minimal service worker: makes The Floor installable. Network-first, no caching of API calls.
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.url.includes('/.netlify/')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
