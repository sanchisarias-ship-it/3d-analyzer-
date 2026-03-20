const CACHE = '3d-analyzer-v7';

// Usar self.location para obtener la base correcta
// sea '/' (Netlify) o '/3d-analyzer-/' (GitHub Pages)
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const LOCAL_FILES = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon.svg',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
];

const CDN_FILES = [
  'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js',
  'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.wasm',
  'https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.min.js',
  'https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.wasm',
];

// INSTALL — cachear todo de forma best-effort (nunca falla la instalación)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled([
        ...LOCAL_FILES.map(url =>
          fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => null)
        ),
        ...CDN_FILES.map(url =>
          fetch(url, { mode:'cors' }).then(r => r.ok ? cache.put(url, r) : null).catch(() => null)
        ),
      ])
    ).then(() => self.skipWaiting())
  );
});

// ACTIVATE — borrar cachés antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// FETCH — network-first para navegación, cache-first para assets CDN
self.addEventListener('fetch', e => {
  const { request: req } = e;
  if (req.method !== 'GET') return;
  if (new URL(req.url).protocol === 'chrome-extension:') return;

  // Navegación HTML — network-first, fallback al index cacheado
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
        .catch(() => caches.match(BASE + 'index.html').then(r => r || caches.match(BASE)))
    );
    return;
  }

  // CDN (WASM, JS, fuentes) — cache-first
  if (req.url.includes('jsdelivr.net') || req.url.includes('fonts.')) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(r => {
          if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
          return r;
        });
      })
    );
    return;
  }

  // Resto — network con fallback a caché
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
