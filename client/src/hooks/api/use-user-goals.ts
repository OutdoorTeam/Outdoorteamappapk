import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { Tables } from '@/lib/database.types';

export interface UserGoals {
  user_id: string;
  daily_steps_goal: number;
  weekly_points_goal: number;
  updated_at: string | null;
}

export const USER_GOALS_KEYS = {
  all: ['user-goals'] as const,
  my: (userId?: string) => ['user-goals', 'my', userId ?? 'anonymous'] as const,
};

const mapGoalsRow = (row: Tables<'goals'>): UserGoals => ({
  user_id: row.user_id,
  daily_steps_goal: row.daily_steps_goal ?? 8000,
  weekly_points_goal: row.week_points_goal ?? 28,
  updated_at: row.updated_at ?? null,
});

export function useMyGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: USER_GOALS_KEYS.my(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data ? mapGoalsRow(data) : null;
    },
  });
}
