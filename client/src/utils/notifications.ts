// Disabled notifications utility - all functions are no-ops or return disabled states

export const isNotificationSupported = (): boolean => {
  return false; // Always disabled
};

export const getNotificationPermission = (): NotificationPermission => {
  return 'denied'; // Always denied
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  throw new Error('Las notificaciones están desactivadas');
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  throw new Error('Las notificaciones están desactivadas');
};

export const getVapidPublicKey = async (): Promise<string> => {
  return 'disabled';
};

export const subscribeToPushNotifications = async () => {
  throw new Error('Las notificaciones están desactivadas');
};

export const getExistingSubscription = async () => {
  return null;
};

export const unsubscribeFromPushNotifications = async () => {
  return true;
};

export const saveSubscriptionToServer = async () => {
  throw new Error('Las notificaciones están desactivadas');
};

export const removeSubscriptionFromServer = async () => {
  return { success: true };
};

export const initializePushNotifications = async () => {
  throw new Error('Las notificaciones están desactivadas');
};

export const setupPushNotifications = async () => {
  throw new Error('Las notificaciones están desactivadas');
};

export const sendTestNotification = async () => {
  throw new Error('Las notificaciones están desactivadas');
};

// Types for notification data (kept for compatibility)
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
