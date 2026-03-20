'use strict';
const CACHE = '3d-analyzer-v9';

const CDN = [
  'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js',
  'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.wasm',
  'https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.min.js',
  'https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.wasm',
];

// INSTALL — solo cachea las librerías CDN pesadas (WASM ~20MB)
// No cachea HTML/CSS — GitHub Pages lo sirve directamente sin problemas
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(
        CDN.map(url =>
          fetch(url, { mode: 'cors' })
            .then(r => { if (r.ok) cache.put(url, r); })
            .catch(() => {})
        )
      )
    )
  );
});

// ACTIVATE — limpiar cachés antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH — SOLO interceptar peticiones CDN para servirlas desde caché
// Las peticiones de navegación (HTML) van SIEMPRE a la red
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // No interceptar NADA que no sea CDN
  if (!url.includes('jsdelivr.net') && !url.includes('fonts.')) return;

  // CDN: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      });
    })
  );
});
