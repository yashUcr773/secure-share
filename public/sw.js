// SecureShare Service Worker
// Provides offline functionality and background sync capabilities

const CACHE_NAME = 'secureshare-v1';
const STATIC_CACHE_NAME = 'secureshare-static-v1';
const DYNAMIC_CACHE_NAME = 'secureshare-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/login',
  '/signup',
  '/offline',
  '/manifest.json',
  // Add critical CSS and JS files
  '/_next/static/css/',
  '/_next/static/js/',
  // Icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API endpoints that should work offline with cached data
const CACHEABLE_API_ROUTES = [
  '/api/files',
  '/api/search',
  '/api/user/profile',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - cache with network first strategy
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first strategy
    event.respondWith(handleStaticAssets(request));
  } else {
    // Page requests - network first with cache fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheableRoute = CACHEABLE_API_ROUTES.some(route => 
    url.pathname.startsWith(route)
  );

  if (!isCacheableRoute) {
    // For non-cacheable routes, just fetch from network
    return fetch(request);
  }

  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('Service Worker: Network failed for API request, trying cache');
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline - This feature requires an internet connection',
        offline: true 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful page responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('Service Worker: Network failed for page request, trying cache');
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page if available
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback offline response
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>SecureShare - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #f8f9fa;
            }
            .container { 
              max-width: 400px; 
              margin: 0 auto; 
              background: white; 
              padding: 2rem; 
              border-radius: 8px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #333; margin-bottom: 1rem; }
            p { color: #666; margin-bottom: 1.5rem; }
            button { 
              background: #2563eb; 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 6px; 
              cursor: pointer;
              font-size: 1rem;
            }
            button:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📡</div>
            <h1>You're Offline</h1>
            <p>SecureShare needs an internet connection to work properly. Please check your connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Background sync for file uploads
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'file-upload') {
    event.waitUntil(syncPendingUploads());
  }
});

// Handle pending file uploads when connection is restored
async function syncPendingUploads() {
  try {
    // Get pending uploads from IndexedDB or localStorage
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        await processUpload(upload);
        await removePendingUpload(upload.id);
        
        // Notify the client about successful upload
        self.registration.showNotification('Upload Complete', {
          body: `${upload.fileName} has been uploaded successfully`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: 'upload-success',
        });
      } catch (error) {
        console.error('Service Worker: Failed to sync upload:', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Placeholder functions for upload management
async function getPendingUploads() {
  // Implementation would use IndexedDB to store pending uploads
  return [];
}

async function processUpload(upload) {
  // Implementation would process the actual upload
  console.log('Processing upload:', upload);
}

async function removePendingUpload(uploadId) {
  // Implementation would remove from IndexedDB
  console.log('Removing pending upload:', uploadId);
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'You have new activity in SecureShare',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/icons/dashboard-action.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close-action.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SecureShare', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Handle app shortcuts (from manifest.json)
self.addEventListener('appinstalled', (event) => {
  console.log('Service Worker: App was installed');
});

console.log('Service Worker: Script loaded');
