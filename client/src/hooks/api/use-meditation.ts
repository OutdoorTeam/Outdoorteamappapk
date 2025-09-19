import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface MeditationSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  meditation_type: 'guided' | 'free';
  comment: string | null;
  completed_at: string;
}

const buildStorageKey = (userId: string) => `meditation-sessions:${userId}`;

export const MEDITATION_KEYS = {
  all: ['meditation'] as const,
  sessions: (userId?: string) => ['meditation', 'sessions', userId ?? 'anonymous'] as const,
};

export function useMeditationSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: MEDITATION_KEYS.sessions(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<MeditationSession[]> => {
      if (!user || typeof window === 'undefined') return [];
      const stored = window.localStorage.getItem(buildStorageKey(user.id));
      if (!stored) return [];
      try {
        return JSON.parse(stored) as MeditationSession[];
      } catch {
        return [];
      }
    },
  });
}

export function useSaveMeditationSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { duration_minutes: number; meditation_type: 'guided' | 'free'; comment?: string }) => {
      if (!user) throw new Error('Usuario no autenticado');
      if (typeof window === 'undefined') {
        return null;
      }

      const storageKey = buildStorageKey(user.id);
      const stored = window.localStorage.getItem(storageKey);
      let sessions: MeditationSession[] = [];
      if (stored) {
        try {
          sessions = JSON.parse(stored) as MeditationSession[];
        } catch {
          sessions = [];
        }
      }

      const newSession: MeditationSession = {
        id: `${Date.now()}`,
        user_id: user.id,
        duration_minutes: data.duration_minutes,
        meditation_type: data.meditation_type,
        comment: data.comment ?? null,
        completed_at: new Date().toISOString(),
      };

      sessions.push(newSession);
      window.localStorage.setItem(storageKey, JSON.stringify(sessions));
      return newSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDITATION_KEYS.sessions(user?.id) });
    },
  });
}
