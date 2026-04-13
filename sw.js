/* =====================================================
   SERVICE WORKER — MAISON ÉLITE
   Gère le cache pour une navigation hors-ligne
   et des chargements ultra-rapides
===================================================== */

const CACHE_NOM    = 'maison-elite-v2';
const CACHE_IMAGES = 'maison-elite-images-v2';

// Fichiers essentiels mis en cache à l'installation
const ASSETS_STATIQUES = [
  './',
  './index.html',
  './admin.html',
  './products.json',
];

/* ── Installation : on met en cache les assets statiques ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NOM)
      .then(cache => cache.addAll(ASSETS_STATIQUES))
      .then(() => self.skipWaiting()) // Activer immédiatement
  );
});

/* ── Activation : supprimer les anciens caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cles =>
      Promise.all(
        cles
          .filter(cle => cle !== CACHE_NOM && cle !== CACHE_IMAGES)
          .map(cle => caches.delete(cle))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch : stratégie selon le type de ressource ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Images externes (Unsplash, etc.) → Cache d'abord, réseau ensuite
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_IMAGES).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          // Retourner un SVG placeholder si l'image est hors-ligne
          return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
              <rect width="400" height="400" fill="#F0EBE3"/>
              <text x="200" y="200" text-anchor="middle" fill="#B5893F" font-size="14">Image non disponible</text>
            </svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      })
    );
    return;
  }

  // JSON des produits → Réseau d'abord, cache en fallback
  if (url.pathname.endsWith('products.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NOM).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Autres ressources → Cache d'abord
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
