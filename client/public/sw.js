// Service Worker for push notifications
console.log('Service Worker: Loading...');

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

// Push event handler
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received', event);
  
  let notificationData = {
    title: 'Outdoor Team',
    body: 'Tienes una nueva notificación',
    icon: '/assets/logo-gold.png',
    badge: '/assets/logo-gold.png',
    tag: 'default',
    url: '/dashboard'
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
      console.log('Service Worker: Notification data parsed', notificationData);
    } catch (error) {
      console.error('Service Worker: Error parsing notification data', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag || 'default',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    data: {
      url: notificationData.url || '/dashboard',
      habitKey: notificationData.habitKey,
      userId: notificationData.userId,
      type: notificationData.type,
      timestamp: Date.now()
    },
    actions: []
  };

  // Add action buttons for habit reminders
  if (notificationData.type === 'habit_reminder' && notificationData.habitKey) {
    notificationOptions.actions = [
      {
        action: 'complete',
        title: 'Marcar Completado',
        icon: '/assets/logo-gold.png'
      },
      {
        action: 'dismiss',
        title: 'Recordar Después',
        icon: '/assets/logo-gold.png'
      }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  const notification = event.notification;
  const data = notification.data;
  
  notification.close();

  // Handle action buttons
  if (event.action === 'complete' && data.habitKey && data.userId) {
    // Mark habit as complete
    event.waitUntil(
      fetch('/api/notifications/mark-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          habitKey: data.habitKey,
          userId: data.userId,
          date: new Date().toISOString().split('T')[0]
        })
      }).then(response => {
        console.log('Service Worker: Habit marked as complete', response.ok);
        
        // Show success notification
        if (response.ok) {
          return self.registration.showNotification('¡Hábito Completado!', {
            body: 'Has marcado tu hábito como completado',
            icon: '/assets/logo-gold.png',
            badge: '/assets/logo-gold.png',
            tag: 'habit-completed',
            vibrate: [100, 50, 100],
            requireInteraction: false
          });
        }
      }).catch(error => {
        console.error('Service Worker: Error marking habit complete', error);
      })
    );
    return;
  }

  if (event.action === 'dismiss') {
    // Just dismiss the notification
    console.log('Service Worker: Notification dismissed');
    return;
  }

  // Open the app or focus existing window
  const url = data.url || '/dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clients) {
        if (client.url === self.location.origin + url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Background sync (for future use)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync event', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      Promise.resolve()
    );
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker: Error occurred', event);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled promise rejection', event);
});

console.log('Service Worker: Loaded successfully');
