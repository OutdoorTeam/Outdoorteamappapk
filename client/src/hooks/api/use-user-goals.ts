import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface UserGoals {
  id: number;
  user_id: number;
  daily_steps_goal: number;
  weekly_points_goal: number;
  created_at: string;
  updated_at: string;
}

// Query keys
export const USER_GOALS_KEYS = {
  all: ['user-goals'] as const,
  byUser: (userId: number) => [...USER_GOALS_KEYS.all, 'user', userId] as const,
  my: () => [...USER_GOALS_KEYS.all, 'my-goals'] as const,
};

// Hook to get current user's goals
export function useMyGoals() {
  return useQuery({
    queryKey: USER_GOALS_KEYS.my(),
    queryFn: () => apiRequest<UserGoals>('/api/my-goals'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}
