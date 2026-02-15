const CACHE_NAME = 'stl-v1';
const assets = [
  'index.html',
  'app_turismo.html',
  'app_contratos.html',
  'logo.png', // Agregamos el logo al cache
  'manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
