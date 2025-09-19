import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toBool } from '@/utils/normalize';
import type { Tables } from '@/lib/database.types';

const formatISODate = (date: Date): string => date.toISOString().split('T')[0];

const computePoints = (row: Tables<'habit_logs'>): number =>
  (toBool(row.exercise) ? 1 : 0) +
  (toBool(row.nutrition) ? 1 : 0) +
  (toBool(row.movement) ? 1 : 0) +
  (toBool(row.meditation) ? 1 : 0);

const mapHabitRow = (row: Tables<'habit_logs'>) => ({
  training_completed: toBool(row.exercise),
  nutrition_completed: toBool(row.nutrition),
  movement_completed: toBool(row.movement),
  meditation_completed: toBool(row.meditation),
  steps: row.steps ?? 0,
  daily_points: computePoints(row),
});

const ensureHabitLog = async (userId: string, date: string): Promise<Tables<'habit_logs'>> => {
  let { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('day', date)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    const insertPayload = {
      user_id: userId,
      day: date,
      exercise: false,
      nutrition: false,
      movement: false,
      meditation: false,
      steps: 0,
    };

    const inserted = await supabase
      .from('habit_logs')
      .insert(insertPayload)
      .select('*')
      .single();

    if (inserted.error) {
      throw inserted.error;
    }

    data = inserted.data;
  }

  return data;
};

export const DAILY_HABITS_KEYS = {
  all: ['daily-habits'] as const,
  today: (userId?: string) => ['daily-habits', 'today', userId ?? 'anonymous'] as const,
  weeklyPoints: (userId?: string) => ['daily-habits', 'weekly-points', userId ?? 'anonymous'] as const,
  calendar: (userId?: string) => ['daily-habits', 'calendar', userId ?? 'anonymous'] as const,
};

export function useTodayHabits() {
  const { user } = useAuth();
  const todayIso = formatISODate(new Date());

  return useQuery({
    queryKey: DAILY_HABITS_KEYS.today(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!user) throw new Error('Usuario no autenticado');
      const habitRow = await ensureHabitLog(user.id, todayIso);
      return mapHabitRow(habitRow);
    },
  });
}

export function useWeeklyPoints() {
  const { user } = useAuth();

  return useQuery({
    queryKey: DAILY_HABITS_KEYS.weeklyPoints(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!user) throw new Error('Usuario no autenticado');

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());

      const fromIso = formatISODate(weekStart);
      const toIso = formatISODate(today);

      const { data, error } = await supabase
        .from('habit_logs')
        .select('day, exercise, nutrition, movement, meditation')
        .eq('user_id', user.id)
        .gte('day', fromIso)
        .lte('day', toIso)
        .order('day', { ascending: true });

      if (error) throw error;

      const dailyData = (data ?? []).map((row) => ({
        date: row.day,
        daily_points: computePoints(row as Tables<'habit_logs'>),
      }));

      const totalPoints = dailyData.reduce((sum, entry) => sum + entry.daily_points, 0);

      return { total_points: totalPoints, daily_data: dailyData, week_start: fromIso };
    },
  });
}

export function useCalendarData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: DAILY_HABITS_KEYS.calendar(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user) throw new Error('Usuario no autenticado');

      const today = new Date();
      const start = new Date(today);
      start.setMonth(start.getMonth() - 3);

      const fromIso = formatISODate(start);
      const toIso = formatISODate(today);

      const { data, error } = await supabase
        .from('habit_logs')
        .select('day, exercise, nutrition, movement, meditation')
        .eq('user_id', user.id)
        .gte('day', fromIso)
        .lte('day', toIso);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        date: row.day,
        daily_points: computePoints(row as Tables<'habit_logs'>),
      }));
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      date: string;
      training_completed?: boolean;
      nutrition_completed?: boolean;
      movement_completed?: boolean;
      meditation_completed?: boolean;
      steps?: number;
    }) => {
      if (!user) throw new Error('Usuario no autenticado');

      await ensureHabitLog(user.id, data.date);
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (typeof data.training_completed !== 'undefined') {
        updates.exercise = data.training_completed;
      }
      if (typeof data.nutrition_completed !== 'undefined') {
        updates.nutrition = data.nutrition_completed;
      }
      if (typeof data.movement_completed !== 'undefined') {
        updates.movement = data.movement_completed;
      }
      if (typeof data.meditation_completed !== 'undefined') {
        updates.meditation = data.meditation_completed;
      }
      if (typeof data.steps !== 'undefined') {
        updates.steps = data.steps;
      }

      const { data: updatedRows, error } = await supabase
        .from('habit_logs')
        .update(updates)
        .eq('id', habitRow.id)
        .select('*')

      if (error) throw error;
      const updated = updatedRows?.[0] as Tables<'habit_logs'>;
      return mapHabitRow(updated);
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData(DAILY_HABITS_KEYS.today(user?.id), result);
      queryClient.invalidateQueries({ queryKey: DAILY_HABITS_KEYS.weeklyPoints(user?.id) });
      queryClient.invalidateQueries({ queryKey: DAILY_HABITS_KEYS.calendar(user?.id) });
    },
  });
}

export function useDailyHabits() {
  const todayHabits = useTodayHabits();
  const weeklyPoints = useWeeklyPoints();
  const calendarData = useCalendarData();
  const updateHabitMutation = useUpdateHabit();

  return {
    data: todayHabits.data,
    isLoading: todayHabits.isLoading,
    error: todayHabits.error,
    weeklyData: weeklyPoints.data,
    weeklyLoading: weeklyPoints.isLoading,
    calendarHabits: calendarData.data,
    calendarLoading: calendarData.isLoading,
    mutate: updateHabitMutation.mutateAsync,
    updateHabit: updateHabitMutation.mutateAsync,
    isPending: updateHabitMutation.isPending,
    todayHabits,
    weeklyPoints,
    updateHabitMutation,
  };
}
