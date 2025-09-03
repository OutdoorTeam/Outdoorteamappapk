
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/utils/error-handling';

// Define interfaces for evaluations
export interface ParqEvaluation {
  id: string;
  user_id: number;
  answers_json: string;
  result_flag: number;
  notes: string | null;
  created_at: string;
}

export interface WhoqolEvaluation {
  id: string;
  user_id: number;
  score_physical: number;
  score_psychological: number;
  score_social: number;
  score_environmental: number;
  score_total: number;
  answers_json: string;
  notes: string | null;
  created_at: string;
}

export interface Pss10Evaluation {
  id: string;
  user_id: number;
  score_total: number;
  category: 'bajo' | 'moderado' | 'alto';
  answers_json: string;
  notes: string | null;
  created_at: string;
}

export type EvaluationType = 'parq' | 'whoqol' | 'pss10';
export type Evaluation = ParqEvaluation | WhoqolEvaluation | Pss10Evaluation;

// Query keys
export const EVALUATIONS_KEYS = {
  all: ['evaluations'] as const,
  byType: (type: EvaluationType) => [...EVALUATIONS_KEYS.all, type] as const,
  byUser: (userId: number, type: EvaluationType) => [...EVALUATIONS_KEYS.byType(type), 'user', userId] as const,
};

// Hook to get user's evaluations
export function useEvaluations(type: EvaluationType) {
  return useQuery<Evaluation[], Error>({
    queryKey: EVALUATIONS_KEYS.byType(type),
    queryFn: () => apiRequest(`/api/evaluations/${type}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get evaluations for a specific user (admin)
export function useUserEvaluations(userId: number, type: EvaluationType) {
    return useQuery<Evaluation[], Error>({
      queryKey: EVALUATIONS_KEYS.byUser(userId, type),
      queryFn: () => apiRequest(`/api/admin/evaluations/${userId}/${type}`),
      enabled: !!userId,
      staleTime: 5 * 60 * 1000,
    });
  }

// Mutation to save a PAR-Q evaluation
export function useSaveParq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ParqEvaluation, 'id' | 'user_id' | 'created_at'>) =>
      apiRequest<ParqEvaluation>('/api/evaluations/parq', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVALUATIONS_KEYS.byType('parq') });
    },
  });
}

// Mutation to save a WHOQOL-BREF evaluation
export function useSaveWhoqol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { scores: any; answers_json: any; notes?: string }) =>
      apiRequest<WhoqolEvaluation>('/api/evaluations/whoqol', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVALUATIONS_KEYS.byType('whoqol') });
    },
  });
}

// Mutation to save a PSS-10 evaluation
export function useSavePss10() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Pss10Evaluation, 'id' | 'user_id' | 'created_at'>) =>
      apiRequest<Pss10Evaluation>('/api/evaluations/pss10', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVALUATIONS_KEYS.byType('pss10') });
    },
  });
}
