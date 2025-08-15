import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const USERS_KEYS = {
  all: ['users'] as const,
  detail: (id: number) => [...USERS_KEYS.all, id] as const,
};

// Hook for all users (admin only)
export function useUsers() {
  return useQuery({
    queryKey: USERS_KEYS.all,
    queryFn: () => apiRequest('/api/users'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook for single user
export function useUser(id: number) {
  return useQuery({
    queryKey: USERS_KEYS.detail(id),
    queryFn: () => apiRequest(`/api/users/${id}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: !!id, // Only run if id is provided
  });
}

// Mutation for toggling user status (admin only)
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      apiRequest(`/api/users/${userId}/toggle-status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive }),
      }),
    onSuccess: (updatedUser, variables) => {
      // Update user in cache
      queryClient.setQueryData(USERS_KEYS.detail(variables.userId), updatedUser);
      
      // Update user in the users list cache
      queryClient.setQueryData(USERS_KEYS.all, (oldData: any[]) =>
        oldData?.map(user => 
          user.id === variables.userId 
            ? { ...user, is_active: updatedUser.is_active }
            : user
        )
      );
    },
  });
}

// Mutation for updating user features (admin only)
export function useUpdateUserFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      userId, 
      features, 
      planType 
    }: { 
      userId: number; 
      features: Record<string, boolean>; 
      planType?: string; 
    }) =>
      apiRequest(`/api/users/${userId}/features`, {
        method: 'PUT',
        body: JSON.stringify({ features, plan_type: planType }),
      }),
    onSuccess: (updatedUser, variables) => {
      // Update user in cache
      queryClient.setQueryData(USERS_KEYS.detail(variables.userId), updatedUser);
      
      // Update user in the users list cache
      queryClient.setQueryData(USERS_KEYS.all, (oldData: any[]) =>
        oldData?.map(user => 
          user.id === variables.userId ? updatedUser : user
        )
      );
    },
  });
}
