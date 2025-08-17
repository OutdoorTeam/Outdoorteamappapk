import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const WORKOUT_KEYS = {
  all: ['workout'] as const,
  ofDay: () => [...WORKOUT_KEYS.all, 'of-day'] as const,
};

// Hook for workout of the day
export function useWorkoutOfDay() {
  return useQuery({
    queryKey: WORKOUT_KEYS.ofDay(),
    queryFn: () => apiRequest('/api/workout-of-day'),
    staleTime: 5 * 60 * 1000, // 5 minutes - workout changes daily
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}
