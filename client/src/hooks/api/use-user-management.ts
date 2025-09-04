import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface UserPermissions {
  id: number;
  user_id: number;
  dashboard_enabled: boolean;
  training_enabled: boolean;
  nutrition_enabled: boolean;
  meditation_enabled: boolean;
  active_breaks_enabled: boolean;
  exercises_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserGoals {
  id: number;
  user_id: number;
  daily_steps_goal: number;
  weekly_points_goal: number;
  created_at: string;
  updated_at: string;
}

export interface UserTodayHabits {
  user_id: number;
  date: string;
  training_completed: number;
  nutrition_completed: number;
  movement_completed: number;
  meditation_completed: number;
  daily_points: number;
  steps: number;
}

export interface UserStepHistory {
  date: string;
  steps: number;
  movement_completed: number;
  daily_points: number;
}

// Query keys
export const USER_MANAGEMENT_KEYS = {
  all: ['user-management'] as const,
  permissions: (userId: number) => [...USER_MANAGEMENT_KEYS.all, 'permissions', userId] as const,
  goals: (userId: number) => [...USER_MANAGEMENT_KEYS.all, 'goals', userId] as const,
  todayHabits: (userId: number) => [...USER_MANAGEMENT_KEYS.all, 'today-habits', userId] as const,
  stepHistory: (userId: number, days?: number) => [...USER_MANAGEMENT_KEYS.all, 'step-history', userId, days] as const,
};

// Hook to get user permissions (admin only)
export function useUserPermissions(userId: number) {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: USER_MANAGEMENT_KEYS.permissions(userId),
    queryFn: () => apiRequest<UserPermissions>(`/api/admin/users/${userId}/permissions`),
    enabled: !!userId && !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to update user permissions (admin only)
export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      userId, 
      permissions 
    }: { 
      userId: number; 
      permissions: Partial<Omit<UserPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>> 
    }) =>
      apiRequest<UserPermissions>(`/api/admin/users/${userId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify(permissions),
      }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_KEYS.permissions(userId) });
    },
  });
}

// Hook to get user goals (admin only)
export function useUserGoals(userId: number) {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: USER_MANAGEMENT_KEYS.goals(userId),
    queryFn: () => apiRequest<UserGoals>(`/api/admin/users/${userId}/goals`),
    enabled: !!userId && !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook to update user goals (admin only)
export function useUpdateUserGoals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      userId, 
      goals 
    }: { 
      userId: number; 
      goals: Partial<Pick<UserGoals, 'daily_steps_goal' | 'weekly_points_goal'>> 
    }) =>
      apiRequest<UserGoals>(`/api/admin/users/${userId}/goals`, {
        method: 'PUT',
        body: JSON.stringify(goals),
      }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_KEYS.goals(userId) });
    },
  });
}

// Hook to get user's today habits (admin only)
export function useUserTodayHabits(userId: number) {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: USER_MANAGEMENT_KEYS.todayHabits(userId),
    queryFn: () => apiRequest<UserTodayHabits>(`/api/admin/users/${userId}/today-habits`),
    enabled: !!userId && !!token,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

// Hook to get user's step history (admin only)
export function useUserStepHistory(userId: number, days: number = 30) {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: USER_MANAGEMENT_KEYS.stepHistory(userId, days),
    queryFn: () => apiRequest<UserStepHistory[]>(`/api/admin/users/${userId}/step-history?days=${days}`),
    enabled: !!userId && !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
