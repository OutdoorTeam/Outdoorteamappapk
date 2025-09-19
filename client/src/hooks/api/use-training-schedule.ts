import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

type UserId = string | number;

const normalizeId = (value: UserId | null | undefined): string =>
  value === null || value === undefined ? '' : String(value);

export interface TrainingSchedule {
  id: number | string;
  user_id: number | string;
  plan_title: string;
  week_number: number;
  status: string;
  created_by: number | string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingExercise {
  id: number | string;
  exercise_name: string;
  content_library_id: number | string | null;
  video_url: string | null;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  intensity: string | null;
  notes: string | null;
  sort_order: number;
  library_title?: string;
}

export interface TrainingScheduleData {
  schedule: TrainingSchedule | null;
  exercises: Record<string, TrainingExercise[]>;
}

// Query keys
export const TRAINING_SCHEDULE_KEYS = {
  all: ['training-schedules'] as const,
  byUser: (normalizedId: string) => [...TRAINING_SCHEDULE_KEYS.all, 'user', normalizedId] as const,
  my: () => [...TRAINING_SCHEDULE_KEYS.all, 'my-schedule'] as const,
};

// Hook to get user's training schedule
export function useUserTrainingSchedule(userId: UserId | null | undefined) {
  const normalizedId = normalizeId(userId);
  return useQuery({
    queryKey: TRAINING_SCHEDULE_KEYS.byUser(normalizedId),
    queryFn: () => apiRequest<TrainingScheduleData>(`/api/users/${normalizedId}/training-schedule`),
    enabled: normalizedId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get current user's training schedule
export function useMyTrainingSchedule() {
  return useQuery({
    queryKey: TRAINING_SCHEDULE_KEYS.my(),
    queryFn: () => apiRequest<TrainingScheduleData>('/api/users/me/training-schedule'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to create/update training schedule (admin only)
export function useCreateTrainingSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      plan_title,
      exercises_by_day,
    }: {
      userId: UserId;
      plan_title: string;
      exercises_by_day: Record<string, any[]>;
    }) => {
      const normalizedId = normalizeId(userId);
      return apiRequest(`/api/users/${normalizedId}/training-schedule`, {
        method: 'POST',
        body: JSON.stringify({ plan_title, exercises_by_day }),
      });
    },
    onSuccess: (_, { userId }) => {
      const normalizedId = normalizeId(userId);
      queryClient.invalidateQueries({ queryKey: TRAINING_SCHEDULE_KEYS.byUser(normalizedId) });
      queryClient.invalidateQueries({ queryKey: TRAINING_SCHEDULE_KEYS.my() });
    },
  });
}

// Hook to update specific exercise (admin only)
export function useUpdateTrainingExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exerciseId,
      updateData,
    }: {
      exerciseId: number | string;
      updateData: Partial<TrainingExercise>;
    }) =>
      apiRequest(`/api/training-exercises/${exerciseId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_SCHEDULE_KEYS.all });
    },
  });
}

// Hook to delete exercise (admin only)
export function useDeleteTrainingExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exerciseId: number | string) =>
      apiRequest(`/api/training-exercises/${exerciseId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_SCHEDULE_KEYS.all });
    },
  });
}
