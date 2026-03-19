const CACHE = '3d-analyzer-v5';
const LOCAL = ['/', '/index.html', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png'];
const CDN = [
  'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js',
  'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.wasm',
  'https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.min.js',
  'https://cdn.jsdelivr.net/npm/rhino3dm@8.17.0/rhino3dm.wasm',
];
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(LOCAL).then(() =>
        Promise.allSettled(CDN.map(u =>
          fetch(u,{mode:'cors'}).then(r=>r.ok?c.put(u,r):null).catch(()=>null)
        ))
      )
    ).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const {request:req}=e;
  if(req.method!=='GET'||new URL(req.url).protocol==='chrome-extension:')return;
  if(req.mode==='navigate'){e.respondWith(fetch(req).then(r=>{caches.open(CACHE).then(c=>c.put(req,r.clone()));return r;}).catch(()=>caches.match('/index.html')));return;}
  if(req.url.includes('jsdelivr.net')||req.url.includes('fonts.')){e.respondWith(caches.match(req).then(h=>h||fetch(req).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(req,r.clone()));return r;})));return;}
  e.respondWith(fetch(req).catch(()=>caches.match(req)));
});
