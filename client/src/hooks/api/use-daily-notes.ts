import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface DailyNote {
  id?: number;
  user_id?: number;
  content: string;
  date: string;
  created_at?: string;
}

// Query keys
export const DAILY_NOTES_KEYS = {
  all: ['daily-notes'] as const,
  today: () => [...DAILY_NOTES_KEYS.all, 'today'] as const,
  byDate: (date: string) => [...DAILY_NOTES_KEYS.all, 'date', date] as const,
};

// Hook to get today's note
export function useTodayNote() {
  return useQuery({
    queryKey: DAILY_NOTES_KEYS.today(),
    queryFn: () => apiRequest<DailyNote>('/api/daily-notes/today'),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

// Hook to get note by specific date
export function useDailyNote(date: string) {
  return useQuery({
    queryKey: DAILY_NOTES_KEYS.byDate(date),
    queryFn: () => apiRequest<DailyNote>(`/api/daily-notes/${date}`),
    enabled: !!date,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation to save/update note
export function useSaveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string; date: string }) =>
      apiRequest<DailyNote>('/api/daily-notes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data, variables) => {
      // Update today's note if it's for today
      const today = new Date().toISOString().split('T')[0];
      if (variables.date === today) {
        queryClient.setQueryData(DAILY_NOTES_KEYS.today(), data);
      }
      
      // Update specific date query
      queryClient.setQueryData(DAILY_NOTES_KEYS.byDate(variables.date), data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: DAILY_NOTES_KEYS.all });
    },
  });
}
