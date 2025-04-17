// Define a unique cache name for versioning
const CACHE_NAME = 'alarm-control-cache-v2'; // Increment version if you change cached files

// List of essential files to cache during installation
// Use paths relative to the root of your site (origin)
const urlsToCache = [
  '/', // Cache the root URL (often serves index.html)
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
];

// --- Service Worker Lifecycle Events ---

// INSTALL: Cache essential assets when the service worker is installed
self.addEventListener('install', event => {
  console.log('[Service Worker] Install event triggered');
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache:', CACHE_NAME);
        console.log('[Service Worker] Caching essential assets:', urlsToCache);
        return cache.addAll(urlsToCache); // Add all essential files to the cache
      })
      .then(() => {
        console.log('[Service Worker] All essential assets cached successfully.');
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Caching failed during install:', error);
      })
  );
});

// ACTIVATE: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate event triggered');
  const cacheWhitelist = [CACHE_NAME]; // Keep only the current cache

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If the cache name isn't in our whitelist, delete it
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients.');
      // Make sure the activated service worker takes control of the page immediately.
      return self.clients.claim();
    })
  );
});

// FETCH: Intercept network requests and serve from cache if available (Cache First Strategy)
self.addEventListener('fetch', event => {
  // We only want to handle GET requests for caching purposes
  if (event.request.method !== 'GET') {
    // For non-GET requests, just fetch from the network as usual.
    return;
  }

  console.log('[Service Worker] Fetching:', event.request.url);

  event.respondWith(
    // 1. Try to find the request in the cache
    caches.match(event.request)
      .then(cachedResponse => {
        // 2. If found in cache, return the cached response
        if (cachedResponse) {
          console.log('[Service Worker] Returning response from cache:', event.request.url);
          return cachedResponse;
        }

        // 3. If not in cache, fetch from the network
        console.log('[Service Worker] Resource not in cache, fetching from network:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
             // Optional: Check if the network response is valid before caching
             // Note: Only cache GET requests with 2xx status. Don't cache opaque responses unless needed.
             /* if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                 const responseToCache = networkResponse.clone(); // Clone response to cache it
                 caches.open(CACHE_NAME)
                     .then(cache => {
                         console.log('[Service Worker] Caching new resource:', event.request.url);
                         cache.put(event.request, responseToCache);
                     });
             } */
             return networkResponse; // Return the network response
          })
          .catch(error => {
            // 4. If network fetch fails (e.g., offline)
            console.error('[Service Worker] Network fetch failed:', error);
            // Optional: Return a custom offline fallback page/resource
            // For assets like CSS/JS, failing might be okay if they were essential and should've been cached.
            // return caches.match('/offline.html'); // Example fallback
            // Or just let the browser handle the error.
          });
      })
  );
});