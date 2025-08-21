// Disabled notifications - all functions return empty/disabled states

export interface NotificationPreferences {
  enabled: boolean;
  habits: string[];
  times: Record<string, string>;
  push_endpoint?: string | null;
}

export interface BroadcastNotificationData {
  title: string;
  body: string;
  url?: string;
}

export interface BroadcastNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  message?: string;
}

// Get user notification preferences (always disabled)
export const useNotificationPreferences = () => {
  return {
    data: {
      enabled: false,
      habits: [],
      times: {},
      push_endpoint: null
    },
    isLoading: false,
    error: null
  };
};

// Update notification preferences (no-op)
export const useUpdateNotificationPreferences = () => {
  return {
    mutateAsync: async () => ({
      enabled: false,
      habits: [],
      times: {},
      push_endpoint: null
    }),
    isPending: false,
    error: null
  };
};

// Subscribe to push notifications (disabled)
export const useSubscribeToPushNotifications = () => {
  return {
    mutateAsync: async () => ({ success: false }),
    isPending: false,
    error: null
  };
};

// Unsubscribe from push notifications (no-op)
export const useUnsubscribeFromPushNotifications = () => {
  return {
    mutateAsync: async () => ({ success: true }),
    isPending: false,
    error: null
  };
};

// Send test notification (disabled)
export const useSendTestNotification = () => {
  return {
    mutateAsync: async () => ({ success: false }),
    isPending: false,
    error: null
  };
};

// Send broadcast notification (disabled)
export const useSendBroadcastNotification = () => {
  return {
    mutateAsync: async (data: BroadcastNotificationData) => ({
      success: false,
      sent: 0,
      failed: 0,
      message: 'Las notificaciones están desactivadas'
    }),
    isPending: false,
    error: null
  };
};

// Get VAPID public key (disabled)
export const useVapidPublicKey = () => {
  return {
    data: 'disabled',
    isLoading: false,
    error: null
  };
};
