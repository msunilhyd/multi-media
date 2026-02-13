// Service Worker for Linus Playlists PWA
const CACHE_NAME = 'linus-playlists-v1';
const RUNTIME_CACHE = 'linus-runtime-cache';

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install service worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Service Worker: Precaching files');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('⚠️ Service Worker: Some files failed to precache:', err);
        // Don't fail installation if some files can't be cached
      });
    })
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('🗑️ Service Worker: Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy: Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (YouTube, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network first strategy for API calls
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Try cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first strategy for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request)
        .then((response) => {
          if (response.status === 200 && (request.destination === 'style' || request.destination === 'script' || request.destination === 'image')) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return offline page if available
          return caches.match('/offline.html');
        });
    })
  );
});

// Background sync for potential future use
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered:', event.tag);
  if (event.tag === 'sync-playlists') {
    event.waitUntil(
      // Implement sync logic here
      Promise.resolve()
    );
  }
});

console.log('✨ Service Worker loaded successfully');
