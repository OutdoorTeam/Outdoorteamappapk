import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface WorkoutOfDay {
  id: number;
  title: string;
  description: string | null;
  exercises_json: string;
  date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Query keys
export const WORKOUT_KEYS = {
  all: ['workout'] as const,
  today: () => [...WORKOUT_KEYS.all, 'today'] as const,
};

// Hook to get workout of the day
export function useWorkoutOfDay() {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: WORKOUT_KEYS.today(),
    queryFn: () => apiRequest<WorkoutOfDay>('/api/workout-of-day'),
    enabled: !!token,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
