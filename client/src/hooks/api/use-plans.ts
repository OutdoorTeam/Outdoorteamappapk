import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const PLANS_KEYS = {
  all: ['plans'] as const,
  active: () => [...PLANS_KEYS.all, 'active'] as const,
};

// Hook for active plans
export function usePlans() {
  return useQuery({
    queryKey: PLANS_KEYS.active(),
    queryFn: () => apiRequest('/api/plans'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}
