import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface TrainingPlan {
  id: number;
  user_id: number;
  title: string | null;
  version: number;
  status: 'draft' | 'published';
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanDay {
  id: number;
  plan_id: number;
  day_index: number;
  title: string | null;
  notes: string | null;
  sort_order: number;
  exercises: TrainingExercise[];
}

export interface TrainingExercise {
  id: number;
  sort_order: number;
  exercise_name: string;
  content_library_id: number | null;
  youtube_url: string | null;
  sets: number | null;
  reps: string | null;
  intensity: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  notes: string | null;
  content_title?: string | null;
  content_video_url?: string | null;
}

export interface TrainingPlanResponse {
  plan: TrainingPlan | null;
  days: TrainingPlanDay[];
  legacyPdf: any | null;
}

// Query keys
export const TRAINING_PLAN_KEYS = {
  all: ['training-plans'] as const,
  byUser: (userId: number) => [...TRAINING_PLAN_KEYS.all, 'user', userId] as const,
};

// Get training plan for a user
export function useTrainingPlan(userId: number) {
  return useQuery({
    queryKey: TRAINING_PLAN_KEYS.byUser(userId),
    queryFn: () => apiRequest<TrainingPlanResponse>(`/api/training-plan/${userId}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!userId,
  });
}

// Create or get draft training plan (admin only)
export function useEnsureDraftTrainingPlan(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<TrainingPlan>(`/api/training-plan/${userId}/draft`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.byUser(userId) });
    },
  });
}

// Update training plan metadata (admin only)
export function useUpdateTrainingPlan(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, ...data }: { planId: number; title?: string; status?: 'draft' | 'published' }) =>
      apiRequest<TrainingPlan>(`/api/training-plan/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.byUser(userId) });
    },
  });
}

// Add or update training plan day (admin only)
export function useAddOrUpdateDay(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      planId, 
      day_index, 
      title, 
      notes, 
      sort_order 
    }: {
      planId: number;
      day_index: number;
      title?: string;
      notes?: string;
      sort_order?: number;
    }) =>
      apiRequest<TrainingPlanDay>(`/api/training-plan/${planId}/day`, {
        method: 'POST',
        body: JSON.stringify({ day_index, title, notes, sort_order }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.byUser(userId) });
    },
  });
}

// Add or update exercise (admin only)
export function useAddOrUpdateExercise(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      dayId, 
      exerciseData 
    }: {
      dayId: number;
      exerciseData: {
        id?: number;
        exercise_name: string;
        content_library_id?: number | null;
        youtube_url?: string | null;
        sets?: number | null;
        reps?: string | null;
        intensity?: string | null;
        rest_seconds?: number | null;
        tempo?: string | null;
        notes?: string | null;
        sort_order?: number;
      };
    }) =>
      apiRequest<TrainingExercise>(`/api/training-plan/day/${dayId}/exercise`, {
        method: 'POST',
        body: JSON.stringify(exerciseData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.byUser(userId) });
    },
  });
}

// Publish training plan (admin only)
export function usePublishTrainingPlan(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: number) =>
      apiRequest<TrainingPlan>(`/api/training-plan/${planId}/publish`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.byUser(userId) });
    },
  });
}

// Delete exercise (admin only)
export function useDeleteExercise(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exerciseId: number) =>
      apiRequest<{ success: boolean }>(`/api/training-plan/exercise/${exerciseId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.byUser(userId) });
    },
  });
}
