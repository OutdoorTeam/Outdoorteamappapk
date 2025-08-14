import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const DAILY_HABITS_KEYS = {
  all: ['daily-habits'] as const,
  today: () => [...DAILY_HABITS_KEYS.all, 'today'] as const,
  weeklyPoints: () => [...DAILY_HABITS_KEYS.all, 'weekly-points'] as const,
  calendar: () => [...DAILY_HABITS_KEYS.all, 'calendar'] as const,
};

// Hook for today's habits
export function useTodayHabits() {
  return useQuery({
    queryKey: DAILY_HABITS_KEYS.today(),
    queryFn: () => apiRequest('/api/daily-habits/today'),
    staleTime: 30 * 1000, // 30 seconds for real-time data
    refetchInterval: 60 * 1000, // Refresh every minute when tab is active
    refetchOnWindowFocus: true,
  });
}

// Hook for weekly points
export function useWeeklyPoints() {
  return useQuery({
    queryKey: DAILY_HABITS_KEYS.weeklyPoints(),
    queryFn: () => apiRequest('/api/daily-habits/weekly-points'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook for calendar data
export function useCalendarData() {
  return useQuery({
    queryKey: DAILY_HABITS_KEYS.calendar(),
    queryFn: () => apiRequest('/api/daily-habits/calendar'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Mutation for updating habits
export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      date: string;
      training_completed?: boolean;
      nutrition_completed?: boolean;
      movement_completed?: boolean;
      meditation_completed?: boolean;
      steps?: number;
    }) => 
      apiRequest('/api/daily-habits/update', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: DAILY_HABITS_KEYS.today() });
      queryClient.invalidateQueries({ queryKey: DAILY_HABITS_KEYS.weeklyPoints() });
      queryClient.invalidateQueries({ queryKey: DAILY_HABITS_KEYS.calendar() });

      // Optimistic update for today's habits
      queryClient.setQueryData(DAILY_HABITS_KEYS.today(), (oldData: any) => ({
        ...oldData,
        ...variables,
        daily_points: data.daily_points,
      }));
    },
  });
}
