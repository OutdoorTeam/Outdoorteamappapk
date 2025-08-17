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

/**
 * Composite hook that aggregates all daily habits related functionality.
 * 
 * ARCHITECTURE DECISION: Opción B - Wrapper Hook
 * 
 * Why this approach over refactoring all imports (Opción A)?
 * 
 * 1. BACKWARD COMPATIBILITY: Existing components importing useDailyHabits continue working
 *    without breaking changes, following semantic versioning principles.
 * 
 * 2. DEVELOPER EXPERIENCE: Provides a single import for components that need multiple 
 *    habits operations, reducing import complexity and cognitive load.
 * 
 * 3. CONSISTENCY: Matches the expected pattern where components expect a unified interface
 *    for related operations (habits data + mutation in one place).
 * 
 * 4. COMPOSITION OVER FRAGMENTATION: Follows React Query best practices of composing
 *    multiple queries/mutations into logical units while keeping individual hooks available
 *    for granular use cases.
 * 
 * 5. FUTURE EXTENSIBILITY: Easy to add new habits-related functionality to this wrapper
 *    without changing consumer components.
 * 
 * 6. SEPARATION OF CONCERNS: Maintains granular hooks (useTodayHabits, useWeeklyPoints, etc.)
 *    for components that only need specific functionality, while providing a unified API
 *    for complex use cases.
 */
export function useDailyHabits() {
  const todayHabits = useTodayHabits();
  const weeklyPoints = useWeeklyPoints();
  const calendarData = useCalendarData();
  const updateHabitMutation = useUpdateHabit();

  return {
    // Today's habits data and loading state
    data: todayHabits.data,
    isLoading: todayHabits.isLoading,
    error: todayHabits.error,
    
    // Weekly summary
    weeklyData: weeklyPoints.data,
    weeklyLoading: weeklyPoints.isLoading,
    
    // Calendar view data
    calendarData: calendarData.data,
    calendarLoading: calendarData.isLoading,
    
    // Mutation function for updating habits
    mutate: updateHabitMutation.mutateAsync,
    updateHabit: updateHabitMutation.mutateAsync,
    isPending: updateHabitMutation.isPending,
    
    // Individual hook access for advanced use cases
    todayHabits,
    weeklyPoints,
    calendarData,
    updateHabitMutation,
  };
}
