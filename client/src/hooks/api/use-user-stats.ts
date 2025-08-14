import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';
import { useAuth } from '@/contexts/AuthContext';

// Query keys
export const USER_STATS_KEYS = {
  all: ['user-stats'] as const,
  byUser: (userId: number) => [...USER_STATS_KEYS.all, userId] as const,
};

// Hook for user statistics
export function useUserStats(userId?: number) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: USER_STATS_KEYS.byUser(targetUserId || 0),
    queryFn: () => apiRequest(`/api/users/${targetUserId}/stats`),
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}
