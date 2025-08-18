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
  exercises?: TrainingExercise[];
}

export interface TrainingExercise {
  id: number;
  day_id: number;
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
  content_video_url?: string | null;
}

export interface TrainingPlanData {
  plan: TrainingPlan | null;
  days: (TrainingPlanDay & { exercises: TrainingExercise[] })[];
}

// Query keys
export const TRAINING_PLAN_KEYS = {
  all: ['training-plans'] as const,
  user: (userId: number) => [...TRAINING_PLAN_KEYS.all, 'user', userId] as const,
  own: () => [...TRAINING_PLAN_KEYS.all, 'own'] as const,
};

// Hook to get user's training plan (admin or own)
export function useTrainingPlan(userId: number) {
  return useQuery({
    queryKey: TRAINING_PLAN_KEYS.user(userId),
    queryFn: () => apiRequest<TrainingPlanData>(`/api/training-plan/user/${userId}`),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook to get own training plan
export function useOwnTrainingPlan() {
  return useQuery({
    queryKey: TRAINING_PLAN_KEYS.own(),
    queryFn: () => apiRequest<TrainingPlanData>('/api/training-plan/own'),
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook to ensure draft training plan exists (admin only)
export function useEnsureDraftTrainingPlan(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<TrainingPlan>(`/api/training-plan/user/${userId}/ensure-draft`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.user(userId) });
    },
  });
}

// Hook to update training plan (admin only)
export function useUpdateTrainingPlan(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, ...data }: { planId: number; title?: string }) =>
      apiRequest<TrainingPlan>(`/api/training-plan/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.user(userId) });
    },
  });
}

// Hook to add or update day (admin only)
export function useAddOrUpdateDay(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, ...dayData }: { 
      planId: number;
      day_index: number;
      title?: string;
      notes?: string;
      sort_order: number;
    }) =>
      apiRequest<TrainingPlanDay>(`/api/training-plan/${planId}/days`, {
        method: 'POST',
        body: JSON.stringify(dayData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.user(userId) });
    },
  });
}

// Hook to add or update exercise (admin only)
export function useAddOrUpdateExercise(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dayId, exerciseData }: { 
      dayId: number;
      exerciseData: Partial<TrainingExercise> & { exercise_name: string };
    }) =>
      apiRequest<TrainingExercise>(`/api/training-plan/days/${dayId}/exercises`, {
        method: 'POST',
        body: JSON.stringify(exerciseData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.user(userId) });
    },
  });
}

// Hook to delete exercise (admin only)
export function useDeleteExercise(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exerciseId: number) =>
      apiRequest(`/api/training-plan/exercises/${exerciseId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.user(userId) });
    },
  });
}

// Hook to publish training plan (admin only)
export function usePublishTrainingPlan(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: number) =>
      apiRequest<TrainingPlan>(`/api/training-plan/${planId}/publish`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_PLAN_KEYS.user(userId) });
    },
  });
}
