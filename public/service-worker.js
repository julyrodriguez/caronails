const CACHE_NAME = 'caro-nails-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/iconCaro.jpeg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia Network-First: intenta red primero. Si falla, va al caché.
self.addEventListener('fetch', (e) => {
  // Solo interceptar peticiones GET locales (evita interceptar llamadas a APIs de Firebase o Firestore)
  if (
    e.request.method !== 'GET' || 
    !e.request.url.startsWith(self.location.origin) ||
    e.request.url.includes('/api/')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Guardar/Actualizar la copia en caché si la respuesta es exitosa
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // En caso de estar sin conexión, servir desde el caché
        return caches.match(e.request);
      })
  );
});
