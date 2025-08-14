// Service Worker for push notifications
const CACHE_NAME = 'outdoor-team-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', function(event) {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  // Only handle GET requests for caching
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Push notification event
self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Push data:', data);
      
      const options = {
        body: data.body || 'Es hora de completar tu hábito',
        icon: '/assets/logo-gold.png',
        badge: '/assets/logo-gold.png',
        vibrate: [100, 50, 100],
        data: {
          ...data,
          dateOfArrival: Date.now(),
          primaryKey: data.id || Date.now()
        },
        actions: [
          {
            action: 'open-app',
            title: 'Ver Dashboard'
          },
          {
            action: 'mark-complete',
            title: 'Marcar Completado'
          }
        ],
        requireInteraction: true,
        silent: false
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Recordatorio de Hábito', options)
      );
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
      // Fallback notification
      event.waitUntil(
        self.registration.showNotification('Outdoor Team', {
          body: 'Tienes nuevas actividades disponibles',
          icon: '/assets/logo-gold.png',
          badge: '/assets/logo-gold.png'
        })
      );
    }
  }
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification click received:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data;

  event.notification.close();

  if (action === 'mark-complete') {
    // Handle mark complete action
    event.waitUntil(
      fetch('/api/notifications/mark-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          habitKey: data.habitKey,
          date: new Date().toISOString().split('T')[0]
        })
      }).catch(err => console.log('[SW] Error marking complete:', err))
    );
  } else {
    // Default action - open app
    event.waitUntil(
      clients.matchAll({
        type: 'window'
      }).then(function(clientList) {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If app is not open, open it
        if (clients.openWindow) {
          return clients.openWindow('/dashboard');
        }
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'habit-update') {
    event.waitUntil(
      // Handle offline habit updates when connection is restored
      syncOfflineHabits()
    );
  }
});

// Function to sync offline habits
async function syncOfflineHabits() {
  try {
    // This would be implemented to sync any offline habit updates
    console.log('[SW] Syncing offline habits...');
  } catch (error) {
    console.error('[SW] Error syncing offline habits:', error);
  }
}

// Handle message from main thread
self.addEventListener('message', function(event) {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
