import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const USER_STATS_KEYS = {
  all: ['user-stats'] as const,
  byUser: (userId: number) => [...USER_STATS_KEYS.all, userId] as const,
};

// Hook for user statistics
export function useUserStats(userId: number) {
  return useQuery({
    queryKey: USER_STATS_KEYS.byUser(userId),
    queryFn: () => apiRequest(`/api/users/${userId}/stats`),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    enabled: !!userId, // Only run if userId is provided
  });
}
