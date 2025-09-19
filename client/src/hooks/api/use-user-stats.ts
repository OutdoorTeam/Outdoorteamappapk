import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface UserStats {
  weekly_points: number;
  average_daily_points: number;
  total_active_days: number;
  average_steps: number;
  completion_rate: number;
  weekly_data: Array<{
    date: string;
    points: number;
  }>;
  monthly_data: Array<{
    date: string;
    training: number;
    nutrition: number;
    movement: number;
    meditation: number;
    points: number;
  }>;
  habit_completion: {
    training: number;
    nutrition: number;
    movement: number;
    meditation: number;
  };
}

// Query keys
export const USER_STATS_KEYS = {
  all: ['user-stats'] as const,
  byUser: (userId: string | null | undefined) => [...USER_STATS_KEYS.all, 'user', userId ?? ''] as const,
};

// Hook to get user statistics (admin view)
export function useUserStats(userId: string | null | undefined) {
  return useQuery({
    queryKey: USER_STATS_KEYS.byUser(userId),
    queryFn: () => apiRequest<UserStats>(`/api/stats/user/${userId}`),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to get current user's statistics
export function useMyStats() {
  return useQuery({
    queryKey: [...USER_STATS_KEYS.all, 'my-stats'],
    queryFn: () => apiRequest<UserStats>('/api/stats/my-stats'),
    staleTime: 60 * 1000, // 1 minute
  });
}
