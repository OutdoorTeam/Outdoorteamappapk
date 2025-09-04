import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface MeditationSession {
  id: number;
  user_id: number;
  duration_minutes: number;
  meditation_type: 'guided' | 'free';
  breathing_cycle_json: string | null;
  comment: string | null;
  completed_at: string;
}

// Query keys
export const MEDITATION_KEYS = {
  all: ['meditation'] as const,
  sessions: () => [...MEDITATION_KEYS.all, 'sessions'] as const,
};

// Hook for meditation sessions
export function useMeditationSessions() {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: MEDITATION_KEYS.sessions(),
    queryFn: () => apiRequest<MeditationSession[]>('/api/meditation-sessions'),
    enabled: !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// Mutation for saving meditation sessions
export function useSaveMeditationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      duration_minutes: number;
      meditation_type: 'guided' | 'free';
      comment?: string;
      breathing_cycle_json?: string;
    }) =>
      apiRequest<MeditationSession>('/api/meditation-sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDITATION_KEYS.sessions() });
    },
  });
}
