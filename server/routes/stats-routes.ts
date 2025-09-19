import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Get user statistics endpoint
router.get('/users/:id/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Users can only view their own stats unless they're admin
    if (requestingUserRole !== 'admin' && parseInt(id) !== requestingUserId) {
      sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
      return;
    }

    const userId = parseInt(id);
    console.log('Fetching statistics for user:', userId);

    // Calculate date ranges
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // Last 7 days including today
    
    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 29); // Last 30 days including today

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const monthStartStr = monthStart.toISOString().split('T')[0];

    console.log('Date ranges - Week:', weekStartStr, 'Month:', monthStartStr);

    // Weekly data - last 7 days
    const weeklyHabits = await db
      .selectFrom('daily_habits')
      .select(['date', 'daily_points', 'steps', 'training_completed', 'nutrition_completed', 'movement_completed', 'meditation_completed'])
      .where('user_id', '=', userId)
      .where('date', '>=', weekStartStr)
      .orderBy('date', 'asc')
      .execute();

    // Weekly meditation sessions
    const weeklyMeditation = await db
      .selectFrom('meditation_sessions')
      .select(['completed_at', 'duration_minutes'])
      .where('user_id', '=', userId)
      .where('completed_at', '>=', weekStart.toISOString())
      .execute();

    // Monthly data - last 30 days
    const monthlyHabits = await db
      .selectFrom('daily_habits')
      .select(['date', 'daily_points', 'steps', 'training_completed', 'nutrition_completed', 'movement_completed', 'meditation_completed'])
      .where('user_id', '=', userId)
      .where('date', '>=', monthStartStr)
      .execute();

    // Monthly meditation sessions
    const monthlyMeditation = await db
      .selectFrom('meditation_sessions')
      .select(['completed_at', 'duration_minutes'])
      .where('user_id', '=', userId)
      .where('completed_at', '>=', monthStart.toISOString())
      .execute();

    // Process weekly data
    const weeklyStats = processWeeklyStats(weeklyHabits, weeklyMeditation, weekStartStr);
    
    // Process monthly data
    const monthlyStats = processMonthlyStats(monthlyHabits, monthlyMeditation);

    console.log('Statistics processed - Weekly points:', weeklyStats.totalPoints, 'Monthly sessions:', monthlyStats.totalMeditationSessions);

    const stats = {
      weekly: weeklyStats,
      monthly: monthlyStats
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    await SystemLogger.logCriticalError('User stats fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener estadÃ­sticas');
  }
});

function processWeeklyStats(weeklyHabits: any[], weeklyMeditation: any[], weekStartStr: string) {
  // Create array of last 7 days
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStartStr);
    date.setDate(date.getDate() + i);
    days.push(date.toISOString().split('T')[0]);
  }

  // Create daily data structure
  const dailyData = days.map(date => {
    const dayData = weeklyHabits.find(h => h.date === date);
    const dayMeditation = weeklyMeditation.filter(m => 
      m.completed_at.split('T')[0] === date
    );

    return {
      date,
      points: dayData?.daily_points || 0,
      steps: dayData?.steps || 0,
      training: dayData?.training_completed || 0,
      nutrition: dayData?.nutrition_completed || 0,
      movement: dayData?.movement_completed || 0,
      meditation: dayData?.meditation_completed || 0,
      meditationSessions: dayMeditation.length,
      meditationMinutes: dayMeditation.reduce((sum, session) => sum + (session.duration_minutes || 0), 0)
    };
  });

  // Calculate totals
  const totalPoints = dailyData.reduce((sum, day) => sum + day.points, 0);
  const totalSteps = dailyData.reduce((sum, day) => sum + day.steps, 0);
  const totalMeditationSessions = dailyData.reduce((sum, day) => sum + day.meditationSessions, 0);
  const totalMeditationMinutes = dailyData.reduce((sum, day) => sum + day.meditationMinutes, 0);
  const averageDailyPoints = totalPoints / 7;

  return {
    dailyData,
    totalPoints,
    totalSteps,
    totalMeditationSessions,
    totalMeditationMinutes,
    averageDailyPoints: Math.round(averageDailyPoints * 10) / 10
  };
}

function processMonthlyStats(monthlyHabits: any[], monthlyMeditation: any[]) {
  const totalDays = 30;
  
  // Count completions per habit
  const trainingDays = monthlyHabits.filter(h => h.training_completed).length;
  const nutritionDays = monthlyHabits.filter(h => h.nutrition_completed).length;
  const movementDays = monthlyHabits.filter(h => h.movement_completed).length;
  const meditationDays = monthlyHabits.filter(h => h.meditation_completed).length;

  // Calculate percentages
  const habitCompletionRates = {
    training: Math.round((trainingDays / totalDays) * 100),
    nutrition: Math.round((nutritionDays / totalDays) * 100),
    movement: Math.round((movementDays / totalDays) * 100),
    meditation: Math.round((meditationDays / totalDays) * 100)
  };

  // Calculate totals
  const totalPoints = monthlyHabits.reduce((sum, h) => sum + (h.daily_points || 0), 0);
  const totalSteps = monthlyHabits.reduce((sum, h) => sum + (h.steps || 0), 0);
  const totalMeditationSessions = monthlyMeditation.length;
  const totalMeditationMinutes = monthlyMeditation.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);

  // Habit completion data for chart
  const habitCompletionData = [
    { name: 'Entrenamiento', completed: trainingDays, total: totalDays, percentage: habitCompletionRates.training },
    { name: 'NutriciÃ³n', completed: nutritionDays, total: totalDays, percentage: habitCompletionRates.nutrition },
    { name: 'Movimiento', completed: movementDays, total: totalDays, percentage: habitCompletionRates.movement },
    { name: 'MeditaciÃ³n', completed: meditationDays, total: totalDays, percentage: habitCompletionRates.meditation }
  ];

  return {
    habitCompletionData,
    habitCompletionRates,
    totalPoints,
    totalSteps,
    totalMeditationSessions,
    totalMeditationMinutes,
    completionCounts: {
      training: trainingDays,
      nutrition: nutritionDays,
      movement: movementDays,
      meditation: meditationDays
    }
  };
}

export default router;

