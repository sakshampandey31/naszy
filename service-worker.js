/* ============================================================================
   NASZY SERVICE WORKER
   ============================================================================
   Enables:
   • Offline functionality
   • Advanced caching strategies (Cache-First, Network-First)
   • Background sync
   • Push notifications
   • Asset pre-caching
   ============================================================================ */

const CACHE_VERSION = 'naszy-v2025.1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/premium-enhancements.css',
  '/enhancements.js',
  '/ai-algorithms.js',
  '/performance-optimizer.js',
  '/collaborative-study.js',
  '/voice-image-processor.js'
];

// ══════════════════════════════════════════════════════════════════
// SERVICE WORKER INSTALLATION & ACTIVATION
// ══════════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[Service Worker] Some assets failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ══════════════════════════════════════════════════════════════════
// FETCH STRATEGY: Network-First for APIs, Cache-First for assets
// ══════════════════════════════════════════════════════════════════

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    event.respondWith(fetch(request).catch(() => cacheOrOffline(request)));
    return;
  }

  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML - Network First with cache fallback
  if (request.method === 'GET' && request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Default - Cache First
  event.respondWith(cacheFirstStrategy(request));
});

// ══════════════════════════════════════════════════════════════════
// CACHING STRATEGIES
// ══════════════════════════════════════════════════════════════════

/**
 * Cache-First Strategy: Return cached version if available, else fetch
 */
async function cacheFirstStrategy(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      updateCache(request, cache); // Update in background
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[Cache-First] Error:', error);
    return cacheOrOffline(request);
  }
}

/**
 * Network-First Strategy: Try network, fallback to cache
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(
        request.url.includes('/api/') ? API_CACHE : DYNAMIC_CACHE
      );
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cache = await caches.open(
      request.url.includes('/api/') ? API_CACHE : DYNAMIC_CACHE
    );
    return cache.match(request) || offlineResponse();
  }
}

/**
 * Update cache in background
 */
async function updateCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    // Silent error - background update failed
  }
}

/**
 * Return cached response or offline page
 */
async function cacheOrOffline(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  return cached || offlineResponse();
}

/**
 * Generate offline response
 */
function offlineResponse() {
  return new Response(
    `<html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline</title>
        <style>
          body { font-family: system-ui; padding: 20px; text-align: center; background: #0b0d12; color: #f9fafb; }
          h1 { font-size: 28px; margin-bottom: 10px; }
          p { font-size: 14px; color: rgba(249,250,251,0.6); }
        </style>
      </head>
      <body>
        <h1>📡 You're Offline</h1>
        <p>Don't worry! Naszy saved your data locally. Your study sessions are waiting for you.</p>
        <p>Check your internet connection and refresh the page.</p>
      </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

/**
 * Check if URL is static asset
 */
function isStaticAsset(pathname) {
  return /\.(js|css|woff2|png|jpg|jpeg|svg|ico)$/.test(pathname);
}

// ══════════════════════════════════════════════════════════════════
// BACKGROUND SYNC
// ══════════════════════════════════════════════════════════════════

self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-study-data') {
    event.waitUntil(syncStudyData());
  }
});

/**
 * Sync study data when back online
 */
async function syncStudyData() {
  try {
    const cache = await caches.open(API_CACHE);
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
      } catch (error) {
        console.error('[Sync] Error syncing:', error);
      }
    }

    console.log('[Service Worker] Sync completed');
  } catch (error) {
    console.error('[Sync] Failed:', error);
  }
}

// ══════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    tag: data.tag || 'naszy-notification',
    requireInteraction: data.requireInteraction || false,
    actions: [
      { action: 'open', title: '📖 Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // If app is already open, focus it
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        // Otherwise, open new window
        return clients.openWindow('/');
      })
    );
  }
});

// ══════════════════════════════════════════════════════════════════
// MESSAGE HANDLERS (Communication with pages)
// ══════════════════════════════════════════════════════════════════

self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data.type);

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(DYNAMIC_CACHE).then(() => {
        event.ports[0].postMessage({ success: true, message: 'Cache cleared' });
      })
    );
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      caches.keys().then(names => {
        const sizes = Promise.all(
          names.map(name => 
            caches.open(name).then(cache => 
              cache.keys().then(keys => ({ name, size: keys.length }))
            )
          )
        );
        return sizes.then(results => {
          event.ports[0].postMessage({ caches: results });
        });
      })
    );
  }
});

console.log('[Service Worker] Loaded and ready');
