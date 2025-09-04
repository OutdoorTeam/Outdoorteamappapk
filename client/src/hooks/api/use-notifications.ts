import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

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
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      return apiRequest<NotificationPreferences>('/api/notifications/preferences');
    },
    enabled: !!token,
    retry: 1,
    staleTime: 30000, // 30 seconds
  });
};

// Update notification preferences (always returns disabled)
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { enabled: boolean; habits: string[]; times: Record<string, string> }) => {
      return apiRequest<NotificationPreferences>('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      // Update the cached preferences
      queryClient.setQueryData(['notification-preferences'], data);
    },
    onError: (error) => {
      console.error('Failed to update notification preferences:', error);
    },
  });
};

// Subscribe to push notifications (disabled)
export const useSubscribeToPushNotifications = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subscriptionData: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
      return apiRequest<{ success: boolean }>('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscriptionData),
      });
    },
    onSuccess: () => {
      // Refresh preferences to get updated subscription status
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
};

// Unsubscribe from push notifications
export const useUnsubscribeFromPushNotifications = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      return apiRequest<{ success: boolean }>('/api/notifications/unsubscribe', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      // Refresh preferences to reflect unsubscribed state
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
};

// Send test notification (disabled)
export const useSendTestNotification = () => {
  return useMutation({
    mutationFn: async () => {
      return apiRequest<{ success: boolean }>('/api/notifications/test', {
        method: 'POST',
      });
    },
  });
};

// Send broadcast notification (disabled)
export const useSendBroadcastNotification = () => {
  return useMutation({
    mutationFn: async (data: BroadcastNotificationData) => {
      return apiRequest<BroadcastNotificationResult>('/api/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  });
};

// Get VAPID public key (disabled)
export const useVapidPublicKey = () => {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: ['vapid-public-key'],
    queryFn: async () => {
      const response = await apiRequest<{ publicKey: string }>('/api/notifications/vapid-public-key');
      return response.publicKey;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};
