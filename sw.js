/* pdf.jsonversal.com — offline app shell cache.
   Caches only this site's own static assets. Never caches user files. */
var CACHE = 'pdfsite-v2';
var ASSETS = [
  './',
  './privacy',
  './manifest.json',
  './icon.svg',
  './assets/site.css',
  './assets/app.js',
  './assets/pdfsite.js',
  './assets/vendor/pdf-lib.min.js',
  './assets/vendor/pdf.min.js',
  './assets/vendor/pdf.worker.min.js',
  './assets/vendor/jszip.min.js',
  './tools/merge',
  './tools/split',
  './tools/rotate',
  './tools/organize',
  './tools/compress',
  './tools/pdf-to-jpg',
  './tools/jpg-to-pdf',
  './tools/page-numbers',
  './tools/extract-text',
  './tools/pdf-to-png',
  './tools/sign',
  './tools/watermark',
  './tools/extract-pages',
  './tools/compare',
  './tools/protect-unlock',
  './tools/remove-metadata',
  './tools/ocr'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        if (e.request.mode === 'navigate') return caches.match('./');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
