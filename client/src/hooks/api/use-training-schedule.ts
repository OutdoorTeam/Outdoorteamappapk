import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

export interface TrainingSchedule {
  id: number;
  user_id: number;
  plan_title: string;
  week_number: number;
  status: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingExercise {
  id: number;
  exercise_name: string;
  content_library_id: number | null;
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
  byUser: (userId: number) => [...TRAINING_SCHEDULE_KEYS.all, 'user', userId] as const,
  my: () => [...TRAINING_SCHEDULE_KEYS.all, 'my-schedule'] as const,
};

// Hook to get user's training schedule
export function useUserTrainingSchedule(userId: number) {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: TRAINING_SCHEDULE_KEYS.byUser(userId),
    queryFn: () => apiRequest<TrainingScheduleData>(`/api/users/${userId}/training-schedule`),
    enabled: !!userId && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get current user's training schedule
export function useMyTrainingSchedule() {
  const token = localStorage.getItem('auth_token');
  return useQuery({
    queryKey: TRAINING_SCHEDULE_KEYS.my(),
    queryFn: () => apiRequest<TrainingScheduleData>('/api/users/me/training-schedule'),
    enabled: !!token,
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
      exercises_by_day 
    }: { 
      userId: number; 
      plan_title: string; 
      exercises_by_day: Record<string, any[]>;
    }) =>
      apiRequest(`/api/users/${userId}/training-schedule`, {
        method: 'POST',
        body: JSON.stringify({ plan_title, exercises_by_day }),
      }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: TRAINING_SCHEDULE_KEYS.byUser(userId) });
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
      updateData 
    }: { 
      exerciseId: number; 
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
    mutationFn: (exerciseId: number) =>
      apiRequest(`/api/training-exercises/${exerciseId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_SCHEDULE_KEYS.all });
    },
  });
}
