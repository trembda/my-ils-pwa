/* ============================================================
   SERVICE WORKER — ILS Lecture de piste
   Stratégie : Cache-first (offline-ready)
   Cache name versionné → mise à jour propre lors des déploiements
   ============================================================ */

const CACHE_NAME = "ils-piste-v1";

// Ressources à pré-cacher à l'installation
const PRECACHE_URLS = [
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png"
];

// ── Installation : pré-cache toutes les ressources ──────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Prend le contrôle immédiatement (sans attendre fermeture onglet)
  self.skipWaiting();
});

// ── Activation : nettoie les anciens caches ──────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch : cache-first avec fallback réseau ─────────────────
self.addEventListener("fetch", (event) => {
  // Ignore les requêtes non-GET et les requêtes chrome-extension
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Ressource en cache → retourne immédiatement
        return cachedResponse;
      }
      // Pas en cache → réseau, puis mise en cache
      return fetch(event.request).then((networkResponse) => {
        // Ne cache que les réponses valides
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== "opaque"
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Hors-ligne et pas en cache → page d'erreur minimaliste
        return new Response(
          `<!DOCTYPE html><html lang="fr"><body style="font-family:system-ui;text-align:center;padding:40px;color:#1a2218">
            <h2>Hors ligne</h2>
            <p>Cette ressource n'est pas disponible hors connexion.</p>
            <a href="./index.html">Retour à l'application</a>
          </body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      });
    })
  );
});
