import express from 'express';
import type { Request, Response } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { SystemLogger } from '../utils/logging.js';
import { ERROR_CODES, sendErrorResponse } from '../utils/validation.js';

const router = express.Router();

// Get user statistics (admin view or own stats)
router.get('/stats/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const targetUserId = parseInt(userId);

    // Users can only access their own stats unless they're admin
    if (requestingUserRole !== 'admin' && targetUserId !== requestingUserId) {
      sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
      return;
    }

    console.log('Fetching user statistics for:', targetUserId);

    // Get current week data
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get last 30 days data
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Weekly points
    const weeklyData = await db
      .selectFrom('daily_habits')
      .select(['date', 'daily_points as points'])
      .where('user_id', '=', targetUserId)
      .where('date', '>=', weekStartStr)
      .orderBy('date')
      .execute();

    const weekly_points = weeklyData.reduce((sum, day) => sum + (day.points || 0), 0);

    // Monthly data for chart
    const monthlyData = await db
      .selectFrom('daily_habits')
      .select([
        'date',
        'training_completed as training',
        'nutrition_completed as nutrition', 
        'movement_completed as movement',
        'meditation_completed as meditation',
        'daily_points as points'
      ])
      .where('user_id', '=', targetUserId)
      .where('date', '>=', thirtyDaysAgoStr)
      .orderBy('date')
      .execute();

    // Calculate averages and totals
    const totalDays = monthlyData.length;
    const average_daily_points = totalDays > 0 ? monthlyData.reduce((sum, day) => sum + (day.points || 0), 0) / totalDays : 0;
    const average_steps = totalDays > 0 ? monthlyData.reduce((sum, day) => sum + (day.points || 0), 0) / totalDays * 2000 : 0; // Rough estimate

    // Habit completion rates
    const habit_completion = {
      training: totalDays > 0 ? (monthlyData.filter(d => d.training).length / totalDays) * 100 : 0,
      nutrition: totalDays > 0 ? (monthlyData.filter(d => d.nutrition).length / totalDays) * 100 : 0,
      movement: totalDays > 0 ? (monthlyData.filter(d => d.movement).length / totalDays) * 100 : 0,
      meditation: totalDays > 0 ? (monthlyData.filter(d => d.meditation).length / totalDays) * 100 : 0,
    };

    const completion_rate = Object.values(habit_completion).reduce((sum, rate) => sum + rate, 0) / 4;

    const stats = {
      weekly_points,
      average_daily_points,
      total_active_days: totalDays,
      average_steps,
      completion_rate,
      weekly_data: weeklyData,
      monthly_data: monthlyData,
      habit_completion
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    await SystemLogger.logCriticalError('User statistics fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener estadísticas del usuario');
  }
});

// Get current user's own statistics
router.get('/stats/my-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    console.log('Fetching own statistics for user:', userId);

    // Reuse the same logic as above but for current user
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Weekly points
    const weeklyData = await db
      .selectFrom('daily_habits')
      .select(['date', 'daily_points as points'])
      .where('user_id', '=', userId)
      .where('date', '>=', weekStartStr)
      .orderBy('date')
      .execute();

    const weekly_points = weeklyData.reduce((sum, day) => sum + (day.points || 0), 0);

    // Monthly data
    const monthlyData = await db
      .selectFrom('daily_habits')
      .select([
        'date',
        'training_completed as training',
        'nutrition_completed as nutrition', 
        'movement_completed as movement',
        'meditation_completed as meditation',
        'daily_points as points',
        'steps'
      ])
      .where('user_id', '=', userId)
      .where('date', '>=', thirtyDaysAgoStr)
      .orderBy('date')
      .execute();

    const totalDays = monthlyData.length;
    const average_daily_points = totalDays > 0 ? monthlyData.reduce((sum, day) => sum + (day.points || 0), 0) / totalDays : 0;
    const average_steps = totalDays > 0 ? monthlyData.reduce((sum, day) => sum + (day.steps || 0), 0) / totalDays : 0;

    const habit_completion = {
      training: totalDays > 0 ? (monthlyData.filter(d => d.training).length / totalDays) * 100 : 0,
      nutrition: totalDays > 0 ? (monthlyData.filter(d => d.nutrition).length / totalDays) * 100 : 0,
      movement: totalDays > 0 ? (monthlyData.filter(d => d.movement).length / totalDays) * 100 : 0,
      meditation: totalDays > 0 ? (monthlyData.filter(d => d.meditation).length / totalDays) * 100 : 0,
    };

    const completion_rate = Object.values(habit_completion).reduce((sum, rate) => sum + rate, 0) / 4;

    const stats = {
      weekly_points,
      average_daily_points,
      total_active_days: totalDays,
      average_steps,
      completion_rate,
      weekly_data: weeklyData,
      monthly_data: monthlyData,
      habit_completion
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching own statistics:', error);
    await SystemLogger.logCriticalError('Own statistics fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener tus estadísticas');
  }
});

export default router;
