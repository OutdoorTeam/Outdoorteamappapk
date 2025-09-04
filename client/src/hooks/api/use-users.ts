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
  detail: (id: number) => [...USERS_KEYS.all, id] as const,
};

// Hook to get all users (admin only)
export function useUsers() {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: USERS_KEYS.all,
    queryFn: () => apiRequest<User[]>('/api/users'),
    enabled: !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to toggle user status (admin only)
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, is_active }: { userId: number; is_active: boolean }) =>
      apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.all });
    },
  });
}
