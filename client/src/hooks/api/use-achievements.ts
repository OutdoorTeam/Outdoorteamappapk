import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Query keys
export const ACHIEVEMENT_KEYS = {
  all: ['achievements'] as const,
  userAchievements: () => [...ACHIEVEMENT_KEYS.all, 'user'] as const,
  leaderboards: () => [...ACHIEVEMENT_KEYS.all, 'leaderboards'] as const,
  stepsLeaderboard: (month?: string) => [...ACHIEVEMENT_KEYS.leaderboards(), 'steps', month] as const,
  habitsLeaderboard: (month?: string) => [...ACHIEVEMENT_KEYS.leaderboards(), 'habits', month] as const,
  admin: () => [...ACHIEVEMENT_KEYS.all, 'admin'] as const,
};

// Hook for user achievements
export function useUserAchievements() {
  return useQuery({
    queryKey: ACHIEVEMENT_KEYS.userAchievements(),
    queryFn: () => apiRequest('/api/achievements/user-achievements'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook for steps leaderboard
export function useStepsLeaderboard(month?: string) {
  return useQuery({
    queryKey: ACHIEVEMENT_KEYS.stepsLeaderboard(month),
    queryFn: () => {
      const params = month ? `?month=${month}` : '';
      return apiRequest(`/api/achievements/leaderboard/steps${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook for habits leaderboard
export function useHabitsLeaderboard(month?: string) {
  return useQuery({
    queryKey: ACHIEVEMENT_KEYS.habitsLeaderboard(month),
    queryFn: () => {
      const params = month ? `?month=${month}` : '';
      return apiRequest(`/api/achievements/leaderboard/habits${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook for admin achievements
export function useAdminAchievements() {
  return useQuery({
    queryKey: ACHIEVEMENT_KEYS.admin(),
    queryFn: () => apiRequest('/api/achievements/admin/achievements'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Mutation for creating achievement (admin)
export function useCreateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      type: 'fixed' | 'progressive';
      category: 'exercise' | 'nutrition' | 'daily_steps' | 'meditation';
      goal_value: number;
      icon_url?: string;
    }) =>
      apiRequest('/api/achievements/admin/achievements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACHIEVEMENT_KEYS.admin() });
    },
  });
}

// Mutation for updating achievement (admin)
export function useUpdateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { 
      id: number; 
      data: {
        name?: string;
        description?: string;
        type?: 'fixed' | 'progressive';
        category?: 'exercise' | 'nutrition' | 'daily_steps' | 'meditation';
        goal_value?: number;
        icon_url?: string;
        is_active?: boolean;
      }
    }) =>
      apiRequest(`/api/achievements/admin/achievements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACHIEVEMENT_KEYS.admin() });
    },
  });
}

// Mutation for deleting achievement (admin)
export function useDeleteAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/achievements/admin/achievements/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACHIEVEMENT_KEYS.admin() });
    },
  });
}
