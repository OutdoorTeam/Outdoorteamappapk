import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  services_included: string;
  features_json: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Query keys
export const PLANS_KEYS = {
  all: ['plans'] as const,
};

// Hook to get all active plans
export function usePlans() {
  return useQuery({
    queryKey: PLANS_KEYS.all,
    queryFn: () => apiRequest<Plan[]>('/api/plans'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
