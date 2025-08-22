// Check if browser supports notifications
export const isNotificationSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Check current notification permission
export const getNotificationPermission = (): NotificationPermission => {
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Las notificaciones no son compatibles con este navegador');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

// Register service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers no son compatibles con este navegador');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    
    console.log('Service Worker registrado:', registration);
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    return registration;
  } catch (error) {
    console.error('Error registrando Service Worker:', error);
    throw error;
  }
};

// Get VAPID public key from server
export const getVapidPublicKey = async (): Promise<string> => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/notifications/vapid-public-key', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get VAPID public key');
    }

    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    // Fallback to default key for development
    return 'BEl62iUYgUivxIkv69yViEuiBIa40HnYmN7J21ZiNvJGDCG6n_bHUXP5Y8v_dKfNwvRz4rHNL8HpEPYWnSAAMoI';
  }
};

// Convert VAPID key
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (registration: ServiceWorkerRegistration) => {
  try {
    const publicKey = await getVapidPublicKey();
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    console.log('Push subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Error suscribiéndose a push notifications:', error);
    throw error;
  }
};

// Get existing push subscription
export const getExistingSubscription = async (registration: ServiceWorkerRegistration) => {
  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error obteniendo suscripción existente:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (subscription: PushSubscription) => {
  try {
    const result = await subscription.unsubscribe();
    console.log('Unsubscribed from push notifications:', result);
    return result;
  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    throw error;
  }
};

// Save subscription to server
export const saveSubscriptionToServer = async (subscription: PushSubscription) => {
  try {
    const token = localStorage.getItem('auth_token');
    
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))),
        auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!))))
      }
    };

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error guardando suscripción');
    }

    const result = await response.json();
    console.log('Subscription saved to server:', result);
    return result;
  } catch (error) {
    console.error('Error saving subscription to server:', error);
    throw error;
  }
};

// Remove subscription from server
export const removeSubscriptionFromServer = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error removiendo suscripción');
    }

    const result = await response.json();
    console.log('Subscription removed from server:', result);
    return result;
  } catch (error) {
    console.error('Error removing subscription from server:', error);
    throw error;
  }
};

// Initialize push notifications
export const initializePushNotifications = async (): Promise<{ 
  registration: ServiceWorkerRegistration; 
  subscription: PushSubscription | null;
}> => {
  try {
    // Register service worker
    const registration = await registerServiceWorker();
    
    // Check for existing subscription
    let subscription = await getExistingSubscription(registration);
    
    return { registration, subscription };
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    throw error;
  }
};

// Setup push notifications with user consent
export const setupPushNotifications = async (): Promise<PushSubscription> => {
  try {
    // Check if supported
    if (!isNotificationSupported()) {
      throw new Error('Las notificaciones no son compatibles con este dispositivo');
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Permisos de notificación denegados. Para activar las notificaciones:\n\n1. Haz clic en el ícono de candado en la barra de direcciones\n2. Cambia "Notificaciones" a "Permitir"\n3. Recarga esta página');
    }

    // Initialize service worker and subscription
    const { registration } = await initializePushNotifications();
    
    // Subscribe to push notifications
    const subscription = await subscribeToPushNotifications(registration);
    
    // Save subscription to server
    await saveSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    throw error;
  }
};

// Send test notification (for development)
export const sendTestNotification = async () => {
  try {
    if (!isNotificationSupported() || getNotificationPermission() !== 'granted') {
      throw new Error('Notificaciones no disponibles');
    }

    new Notification('Outdoor Team - Test', {
      body: 'Esta es una notificación de prueba desde el navegador',
      icon: '/assets/logo-gold.png',
      badge: '/assets/logo-gold.png',
      vibrate: [100, 50, 100],
      tag: 'test-notification',
      requireInteraction: false
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};

// Types for notification data
export interface NotificationPreferences {
  enabled: boolean;
  habits: string[];
  times: Record<string, string>;
}

export interface HabitNotification {
  habitKey: string;
  habitName: string;
  time: string;
  enabled: boolean;
}
