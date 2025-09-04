import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface NutritionPlan {
  id: number;
  user_id: number;
  content_md: string | null;
  version: number;
  status: 'draft' | 'published';
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionPlanResponse {
  plan: NutritionPlan | null;
  legacyPdf: any | null;
}

// Query keys
export const NUTRITION_PLAN_KEYS = {
  all: ['nutrition-plans'] as const,
  byUser: (userId: number) => [...NUTRITION_PLAN_KEYS.all, 'user', userId] as const,
};

// Get nutrition plan for a user
export function useNutritionPlan(userId: number) {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: NUTRITION_PLAN_KEYS.byUser(userId),
    queryFn: () => apiRequest<NutritionPlanResponse>(`/api/nutrition-plan/${userId}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!userId && !!token,
  });
}

// Upsert nutrition plan (admin only)
export function useUpsertNutritionPlan(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content_md?: string; status?: 'draft' | 'published' }) =>
      apiRequest<NutritionPlan>(`/api/nutrition-plan/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalidate the user's nutrition plan
      queryClient.invalidateQueries({ queryKey: NUTRITION_PLAN_KEYS.byUser(userId) });
    },
  });
}
