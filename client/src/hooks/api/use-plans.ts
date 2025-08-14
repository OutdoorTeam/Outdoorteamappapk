import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const PLANS_KEYS = {
  all: ['plans'] as const,
  detail: (id: number) => [...PLANS_KEYS.all, id] as const,
};

// Hook for all plans
export function usePlans() {
  return useQuery({
    queryKey: PLANS_KEYS.all,
    queryFn: () => apiRequest('/api/plans'),
    staleTime: 15 * 60 * 1000, // 15 minutes - plans rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for single plan
export function usePlan(id: number) {
  return useQuery({
    queryKey: PLANS_KEYS.detail(id),
    queryFn: () => apiRequest(`/api/plans/${id}`),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    enabled: !!id, // Only run if id is provided
  });
}

// Mutation for assigning plan to user
export function useAssignPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, planId }: { userId: number; planId: number }) =>
      apiRequest(`/api/users/${userId}/assign-plan`, {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }),
    onSuccess: () => {
      // Invalidate user data and auth context
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // Force page reload to update auth context
      window.location.reload();
    },
  });
}

// Mutation for updating plan (admin only)
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { 
      id: number; 
      data: {
        name: string;
        description: string;
        price: number;
        services_included: string[];
        features: Record<string, boolean>;
        is_active: boolean;
      }
    }) =>
      apiRequest(`/api/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (updatedPlan, variables) => {
      // Update the cache with the new plan data
      queryClient.setQueryData(PLANS_KEYS.detail(variables.id), updatedPlan);
      
      // Invalidate the all plans query to refresh the list
      queryClient.invalidateQueries({ queryKey: PLANS_KEYS.all });
    },
  });
}
