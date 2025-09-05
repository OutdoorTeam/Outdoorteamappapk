import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  plan_type: string | null;
  is_active: boolean;
  features: {
    habits: boolean;
    training: boolean;
    nutrition: boolean;
    meditation: boolean;
    active_breaks: boolean;
  };
  created_at: string;
}

// Query keys
export const USERS_KEYS = {
  all: ['users'] as const,
  detail: (id: number) => [...USERS_KEYS.all, 'detail', id] as const,
};

// Hook to get all users (admin only)
export function useUsers() {
  return useQuery({
    queryKey: USERS_KEYS.all,
    queryFn: () => apiRequest<User[]>('/api/users'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get user by ID
export function useUser(userId: number) {
  return useQuery({
    queryKey: USERS_KEYS.detail(userId),
    queryFn: () => apiRequest<User>(`/api/users/${userId}`),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation to toggle user status
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, is_active }: { userId: number; is_active: boolean }) =>
      apiRequest(`/api/users/${userId}/toggle-status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.all });
    },
  });
}

// Mutation to assign plan to user
export function useAssignPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, planId }: { userId: number; planId: number }) =>
      apiRequest(`/api/users/${userId}/assign-plan`, {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.all });
    },
  });
}
