import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const DAILY_NOTES_KEYS = {
  all: ['daily-notes'] as const,
  today: () => [...DAILY_NOTES_KEYS.all, 'today'] as const,
  byDate: (date: string) => [...DAILY_NOTES_KEYS.all, date] as const,
};

// Hook for today's note
export function useTodayNote() {
  return useQuery({
    queryKey: DAILY_NOTES_KEYS.today(),
    queryFn: () => apiRequest('/api/daily-notes/today'),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

// Mutation for saving notes
export function useSaveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string; date?: string }) =>
      apiRequest('/api/daily-notes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data, variables) => {
      // Update the cache with the new note
      queryClient.setQueryData(DAILY_NOTES_KEYS.today(), data);
      
      // If saving for a specific date, update that cache too
      if (variables.date) {
        queryClient.setQueryData(DAILY_NOTES_KEYS.byDate(variables.date), data);
      }
    },
  });
}
