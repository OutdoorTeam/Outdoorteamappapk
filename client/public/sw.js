// client/public/sw.js
// Service Worker para Outdoor Team (versión nueva)
const CACHE_NAME = "outdoor-team-v2"; // <- bump de versión para limpiar caché viejo
const URLS_TO_CACHE = [
  "/", // shell básico
  "/site.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

// Instalar: precache mínimo y activar de inmediato
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .catch((err) => console.error("SW install cache error:", err)),
  );
  self.skipWaiting();
});

// Activar: borrar cachés viejos y tomar control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) =>
            key !== CACHE_NAME ? caches.delete(key) : undefined,
          ),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch:
// - No interceptar métodos que no sean GET
// - No interceptar /api/*
// - No interceptar /assets/* (deja que vayan a red/CDN)
// - Estrategia cache-first para lo demás, con fallback a red
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Evitar APIs
  if (url.pathname.startsWith("/api/")) return;

  // Evitar estáticos versionados de Vite
  if (url.pathname.startsWith("/assets/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // Si falla red y es navegación, devolver shell
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
      });
    }),
  );
});

// (Opcional) eventos de push/notification podrían agregarse después si los necesitás.
// Mantenerlo simple hasta estabilizar el deploy.
