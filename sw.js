'use strict';
const CACHE    = '3d-analyzer-v8';
const REPO     = '/3d-analyzer-/';   // <- nombre del repositorio GitHub Pages

const LOCAL = [
  REPO,
  REPO + 'index.html',
  REPO + 'manifest.json',
  REPO + 'icon.svg',
  REPO + 'icon-192.png',
  REPO + 'icon-512.png',
];

const CDN = [
  'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js',
  'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.wasm',
  'https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.min.js',
  'https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.wasm',
];

// INSTALL — best-effort: nunca rechaza aunque algún fetch falle
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled([
        ...LOCAL.map(url =>
          fetch(url).then(r => { if (r.ok) cache.put(url, r); }).catch(() => {})
        ),
        ...CDN.map(url =>
          fetch(url, { mode: 'cors' }).then(r => { if (r.ok) cache.put(url, r); }).catch(() => {})
        ),
      ])
    ).then(() => self.skipWaiting())
  );
});

// ACTIVATE — limpiar cachés antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', e => {
  const { request: req } = e;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol === 'chrome-extension:') return;

  // Navegación → network-first, fallback al index cacheado
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
        .catch(() =>
          caches.match(REPO + 'index.html')
            .then(r => r || caches.match(REPO))
        )
    );
    return;
  }

  // CDN (WASM, JS, fuentes) → cache-first
  if (url.hostname.includes('jsdelivr.net') || url.hostname.includes('fonts.')) {
    e.respondWith(
      caches.match(req).then(cached => cached ||
        fetch(req).then(r => {
          if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
          return r;
        })
      )
    );
    return;
  }

  // Resto → network, fallback a caché
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
