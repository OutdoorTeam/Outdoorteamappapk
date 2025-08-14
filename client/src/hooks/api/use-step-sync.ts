import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const STEP_SYNC_KEYS = {
  all: ['step-sync'] as const,
  settings: () => [...STEP_SYNC_KEYS.all, 'settings'] as const,
  history: () => [...STEP_SYNC_KEYS.all, 'history'] as const,
};

// Hook for step sync settings
export function useStepSyncSettings() {
  return useQuery({
    queryKey: STEP_SYNC_KEYS.settings(),
    queryFn: () => apiRequest('/api/step-sync/settings'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for step sync history
export function useStepSyncHistory(limit = 30) {
  return useQuery({
    queryKey: [...STEP_SYNC_KEYS.history(), limit],
    queryFn: () => apiRequest(`/api/step-sync/history?limit=${limit}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation for updating step sync settings
export function useUpdateStepSyncSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: {
      googleFitEnabled?: boolean;
      appleHealthEnabled?: boolean;
    }) =>
      apiRequest('/api/step-sync/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(STEP_SYNC_KEYS.settings(), data);
    },
  });
}

// Mutation for Google Fit authorization
export function useGoogleFitAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (authData: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: number;
    }) =>
      apiRequest('/api/step-sync/google-fit/auth', {
        method: 'POST',
        body: JSON.stringify(authData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STEP_SYNC_KEYS.settings() });
    },
  });
}

// Mutation for Apple Health authorization
export function useAppleHealthAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest('/api/step-sync/apple-health/auth', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STEP_SYNC_KEYS.settings() });
    },
  });
}

// Mutation for syncing step data
export function useSyncSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      steps: number;
      date: string;
      source: 'google_fit' | 'apple_health';
      timezone?: string;
    }) =>
      apiRequest('/api/step-sync/sync-steps', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: STEP_SYNC_KEYS.history() });
      queryClient.invalidateQueries({ queryKey: ['daily-habits'] });
    },
  });
}

// Mutation for force sync
export function useForceSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest('/api/step-sync/force-sync', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STEP_SYNC_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['daily-habits'] });
    },
  });
}
