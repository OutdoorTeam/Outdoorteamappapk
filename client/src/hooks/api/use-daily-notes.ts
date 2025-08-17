import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface DailyNote {
  id: number;
  content: string;
  date: string;
  created_at: string;
}

// Query keys
export const DAILY_NOTES_KEYS = {
  all: ['daily-notes'] as const,
  today: () => [...DAILY_NOTES_KEYS.all, 'today'] as const,
};

// Hook for today's note
export function useTodayNote() {
  return useQuery({
    queryKey: DAILY_NOTES_KEYS.today(),
    queryFn: () => apiRequest<DailyNote>('/api/daily-notes/today'),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

// Mutation for saving notes
export function useSaveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string; date?: string }) =>
      apiRequest<DailyNote>('/api/daily-notes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DAILY_NOTES_KEYS.today() });
    },
  });
}
