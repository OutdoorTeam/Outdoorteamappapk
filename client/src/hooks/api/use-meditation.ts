import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const MEDITATION_KEYS = {
  all: ['meditation'] as const,
  sessions: () => [...MEDITATION_KEYS.all, 'sessions'] as const,
};

// Hook for meditation sessions
export function useMeditationSessions() {
  return useQuery({
    queryKey: MEDITATION_KEYS.sessions(),
    queryFn: () => apiRequest('/api/meditation-sessions'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Mutation for saving meditation session
export function useSaveMeditationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      duration_minutes: number;
      meditation_type: string;
      comment?: string;
      breathing_cycle_json?: string;
    }) =>
      apiRequest('/api/meditation-sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (newSession) => {
      // Add the new session to the existing sessions cache
      queryClient.setQueryData(MEDITATION_KEYS.sessions(), (oldData: any[]) => 
        oldData ? [newSession, ...oldData] : [newSession]
      );

      // Invalidate daily habits to reflect meditation completion
      queryClient.invalidateQueries({ queryKey: ['daily-habits'] });
    },
  });
}
