// Service Worker for Push Notifications
const CACHE_NAME = 'outdoor-team-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Push event
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'Outdoor Team',
    body: 'Tienes una nueva notificación',
    icon: '/assets/logo-gold.png',
    badge: '/assets/logo-gold.png',
    url: '/',
    type: 'default'
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
      console.log('Parsed notification data:', notificationData);
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }
  
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url,
      type: notificationData.type,
      habitKey: notificationData.habitKey,
      userId: notificationData.userId,
      timestamp: Date.now()
    },
    actions: []
  };
  
  // Add action buttons for habit reminders
  if (notificationData.type === 'habit_reminder' && notificationData.habitKey) {
    notificationOptions.actions = [
      {
        action: 'mark-complete',
        title: 'Marcar Completado',
        icon: '/assets/check-icon.png'
      },
      {
        action: 'open',
        title: 'Abrir App',
        icon: '/assets/open-icon.png'
      }
    ];
    notificationOptions.requireInteraction = true;
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  
  if (event.action === 'mark-complete') {
    // Handle mark complete action
    if (notificationData.habitKey && notificationData.userId) {
      event.waitUntil(
        markHabitComplete(notificationData.habitKey, notificationData.userId)
      );
    }
    return;
  }
  
  // Default action: open the app
  const urlToOpen = notificationData.url || '/dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if the app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin)) {
          // Focus the existing window and navigate
          client.focus();
          return client.navigate(urlToOpen);
        }
      }
      
      // Open new window if app is not open
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Function to mark habit as complete
async function markHabitComplete(habitKey, userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch('/api/notifications/mark-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        habitKey,
        userId,
        date: today
      })
    });
    
    if (response.ok) {
      // Show success notification
      await self.registration.showNotification('¡Hábito completado!', {
        body: 'Se agregó 1 punto a tu progreso diario',
        icon: '/assets/logo-gold.png',
        badge: '/assets/logo-gold.png',
        tag: 'habit-completed',
        data: { url: '/dashboard' }
      });
    } else {
      throw new Error('Failed to mark habit as complete');
    }
  } catch (error) {
    console.error('Error marking habit complete:', error);
    
    // Show error notification
    await self.registration.showNotification('Error', {
      body: 'No se pudo marcar el hábito. Abre la app para intentar nuevamente.',
      icon: '/assets/logo-gold.png',
      badge: '/assets/logo-gold.png',
      tag: 'habit-error',
      data: { url: '/dashboard' }
    });
  }
}

// Background sync (future implementation)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'habit-sync') {
    event.waitUntil(syncHabits());
  }
});

async function syncHabits() {
  // Future implementation for offline habit tracking
  console.log('Syncing habits...');
}

// Periodic background sync (future implementation)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync:', event.tag);
  
  if (event.tag === 'daily-reminder') {
    event.waitUntil(checkDailyReminders());
  }
});

async function checkDailyReminders() {
  // Future implementation for daily reminders
  console.log('Checking daily reminders...');
}

// Message event for communication with the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker loaded successfully');
