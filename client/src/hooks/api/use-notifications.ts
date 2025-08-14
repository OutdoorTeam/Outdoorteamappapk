import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';
import { NotificationPreferences } from '@/utils/notifications';

// Query keys
export const NOTIFICATIONS_KEYS = {
  all: ['notifications'] as const,
  preferences: () => [...NOTIFICATIONS_KEYS.all, 'preferences'] as const,
};

// Hook for user notification preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEYS.preferences(),
    queryFn: () => apiRequest('/api/notifications/preferences'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Mutation for updating notification preferences
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      apiRequest('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      }),
    onSuccess: (data) => {
      // Update the cache with new preferences
      queryClient.setQueryData(NOTIFICATIONS_KEYS.preferences(), data);
    },
  });
}

// Mutation for subscribing to push notifications
export function useSubscribeToPush() {
  return useMutation({
    mutationFn: (subscriptionData: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }) =>
      apiRequest('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscriptionData),
      }),
  });
}

// Mutation for unsubscribing from push notifications
export function useUnsubscribeFromPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest('/api/notifications/unsubscribe', {
        method: 'POST',
      }),
    onSuccess: () => {
      // Invalidate preferences to reflect unsubscription
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEYS.preferences() });
    },
  });
}

// Mutation for sending test notification
export function useSendTestNotification() {
  return useMutation({
    mutationFn: () =>
      apiRequest('/api/notifications/test', {
        method: 'POST',
      }),
  });
}

// Mutation for admin broadcast notifications
export function useSendBroadcastNotification() {
  return useMutation({
    mutationFn: (data: { title: string; body: string; url?: string }) =>
      apiRequest('/api/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
