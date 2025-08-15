import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const WORKOUT_KEYS = {
  all: ['workout'] as const,
  today: () => [...WORKOUT_KEYS.all, 'today'] as const,
};

// Hook for workout of the day
export function useWorkoutOfDay() {
  return useQuery({
    queryKey: WORKOUT_KEYS.today(),
    queryFn: () => apiRequest('/api/workout-of-day'),
    staleTime: 60 * 60 * 1000, // 1 hour - workout changes daily
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
  });
}
