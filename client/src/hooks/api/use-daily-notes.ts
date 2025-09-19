import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface DailyNote {
  content: string;
  date: string;
}

const buildStorageKey = (userId: string, date: string) => `daily-note:${userId}:${date}`;

export const DAILY_NOTES_KEYS = {
  all: ['daily-notes'] as const,
  today: (userId?: string) => ['daily-notes', 'today', userId ?? 'anonymous'] as const,
  byDate: (userId: string | undefined, date: string) => ['daily-notes', 'date', userId ?? 'anonymous', date] as const,
};

export function useTodayNote() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: DAILY_NOTES_KEYS.today(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<DailyNote> => {
      if (!user) throw new Error('Usuario no autenticado');

      if (typeof window === 'undefined') {
        return { content: '', date: today };
      }

      const stored = window.localStorage.getItem(buildStorageKey(user.id, today));
      return { content: stored ?? '', date: today };
    },
  });
}

export function useDailyNote(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: DAILY_NOTES_KEYS.byDate(user?.id, date),
    enabled: Boolean(user?.id && date),
    queryFn: async (): Promise<DailyNote> => {
      if (!user) throw new Error('Usuario no autenticado');
      if (typeof window === 'undefined') {
        return { content: '', date };
      }
      const stored = window.localStorage.getItem(buildStorageKey(user.id, date));
      return { content: stored ?? '', date };
    },
  });
}

export function useSaveNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ content, date }: { content: string; date: string }) => {
      if (!user) throw new Error('Usuario no autenticado');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(buildStorageKey(user.id, date), content);
      }
      return { content, date } as DailyNote;
    },
    onSuccess: (note) => {
      queryClient.setQueryData(DAILY_NOTES_KEYS.today(user?.id), note);
      if (user) {
        queryClient.setQueryData(DAILY_NOTES_KEYS.byDate(user.id, note.date), note);
      }
    },
  });
}
