import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface AdminUserGoals {
  id: number;
  user_id: number;
  daily_steps_goal: number;
  weekly_points_goal: number;
  created_at: string;
  updated_at: string;
}

// Query keys
export const ADMIN_USER_GOALS_KEYS = {
  all: ['admin-user-goals'] as const,
  byUser: (userId: number) => [...ADMIN_USER_GOALS_KEYS.all, 'user', userId] as const,
};

// Hook to get user goals (admin only)
export function useAdminUserGoals(userId: number) {
  return useQuery({
    queryKey: ADMIN_USER_GOALS_KEYS.byUser(userId),
    queryFn: () => apiRequest<AdminUserGoals>(`/api/admin/users/${userId}/goals`),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to update user goals (admin only)
export function useUpdateAdminUserGoals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      userId, 
      goals 
    }: { 
      userId: number; 
      goals: Partial<Pick<AdminUserGoals, 'daily_steps_goal' | 'weekly_points_goal'>> 
    }) =>
      apiRequest<AdminUserGoals>(`/api/admin/users/${userId}/goals`, {
        method: 'PUT',
        body: JSON.stringify(goals),
      }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USER_GOALS_KEYS.byUser(userId) });
      // Also invalidate the user's own goals query
      queryClient.invalidateQueries({ queryKey: ['user-goals', 'my-goals'] });
    },
  });
}
