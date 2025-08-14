import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const USERS_KEYS = {
  all: ['users'] as const,
  list: () => [...USERS_KEYS.all, 'list'] as const,
};

// Hook for all users (admin only)
export function useUsers() {
  return useQuery({
    queryKey: USERS_KEYS.list(),
    queryFn: () => apiRequest('/api/users'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
