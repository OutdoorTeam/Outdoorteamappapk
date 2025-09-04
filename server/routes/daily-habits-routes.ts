import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Get today's habits for the authenticated user
router.get('/daily-habits/today', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Fetching today habits for user:', userId, 'date:', today);

    let todayHabits = await db
      .selectFrom('daily_habits')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', today)
      .executeTakeFirst();

    if (!todayHabits) {
      // Create default record for today
      todayHabits = await db
        .insertInto('daily_habits')
        .values({
          user_id: userId,
          date: today,
          training_completed: 0,
          nutrition_completed: 0,
          movement_completed: 0,
          meditation_completed: 0,
          daily_points: 0,
          steps: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning([
          'id', 'user_id', 'date', 'training_completed', 'nutrition_completed', 
          'movement_completed', 'meditation_completed', 'daily_points', 'steps'
        ])
        .executeTakeFirst();
    }

    console.log('Today habits fetched:', todayHabits);
    res.json(todayHabits);
  } catch (error) {
    console.error('Error fetching today habits:', error);
    await SystemLogger.logCriticalError('Today habits fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener hábitos de hoy');
  }
});

// Get weekly points for the authenticated user
router.get('/daily-habits/weekly-points', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, etc.
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Monday as start of week
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    console.log('Fetching weekly points for user:', userId, 'from:', weekStartStr);

    const weeklyData = await db
      .selectFrom('daily_habits')
      .select(['date', 'daily_points'])
      .where('user_id', '=', userId)
      .where('date', '>=', weekStartStr)
      .orderBy('date', 'asc')
      .execute();

    const totalPoints = weeklyData.reduce((sum, day) => sum + (day.daily_points || 0), 0);

    const result = {
      total_points: totalPoints,
      daily_data: weeklyData,
      week_start: weekStartStr
    };

    console.log('Weekly points fetched:', result.total_points);
    res.json(result);
  } catch (error) {
    console.error('Error fetching weekly points:', error);
    await SystemLogger.logCriticalError('Weekly points fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener puntos semanales');
  }
});

// Get calendar data for the authenticated user
router.get('/daily-habits/calendar', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const monthsBack = 3; // Get last 3 months of data
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - monthsBack);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    console.log('Fetching calendar data for user:', userId, 'from:', startDateStr);

    const calendarData = await db
      .selectFrom('daily_habits')
      .select(['date', 'daily_points'])
      .where('user_id', '=', userId)
      .where('date', '>=', startDateStr)
      .orderBy('date', 'desc')
      .execute();

    console.log('Calendar data fetched:', calendarData.length, 'days');
    res.json(calendarData);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    await SystemLogger.logCriticalError('Calendar data fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener datos del calendario');
  }
});

// Update daily habits
router.put('/daily-habits/update', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { 
      date, 
      training_completed, 
      nutrition_completed, 
      movement_completed, 
      meditation_completed, 
      steps 
    } = req.body;
    
    console.log('Updating daily habits for user:', userId, 'date:', date, 'data:', req.body);

    if (!date) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Fecha requerida');
      return;
    }

    // Get current record or create new one
    let currentHabits = await db
      .selectFrom('daily_habits')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', date)
      .executeTakeFirst();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Update fields that were provided
    if (training_completed !== undefined) updateData.training_completed = training_completed ? 1 : 0;
    if (nutrition_completed !== undefined) updateData.nutrition_completed = nutrition_completed ? 1 : 0;
    if (movement_completed !== undefined) updateData.movement_completed = movement_completed ? 1 : 0;
    if (meditation_completed !== undefined) updateData.meditation_completed = meditation_completed ? 1 : 0;
    if (steps !== undefined) updateData.steps = steps;

    // Calculate points based on completed habits
    const habitsToCheck = {
      training_completed: training_completed !== undefined ? (training_completed ? 1 : 0) : (currentHabits?.training_completed || 0),
      nutrition_completed: nutrition_completed !== undefined ? (nutrition_completed ? 1 : 0) : (currentHabits?.nutrition_completed || 0),
      movement_completed: movement_completed !== undefined ? (movement_completed ? 1 : 0) : (currentHabits?.movement_completed || 0),
      meditation_completed: meditation_completed !== undefined ? (meditation_completed ? 1 : 0) : (currentHabits?.meditation_completed || 0)
    };

    const dailyPoints = Object.values(habitsToCheck).reduce((sum, completed) => sum + completed, 0);
    updateData.daily_points = dailyPoints;

    let result;
    if (currentHabits) {
      // Update existing record
      result = await db
        .updateTable('daily_habits')
        .set(updateData)
        .where('user_id', '=', userId)
        .where('date', '=', date)
        .returning([
          'id', 'user_id', 'date', 'training_completed', 'nutrition_completed',
          'movement_completed', 'meditation_completed', 'daily_points', 'steps'
        ])
        .executeTakeFirst();
    } else {
      // Create new record
      result = await db
        .insertInto('daily_habits')
        .values({
          user_id: userId,
          date: date,
          training_completed: updateData.training_completed || 0,
          nutrition_completed: updateData.nutrition_completed || 0,
          movement_completed: updateData.movement_completed || 0,
          meditation_completed: updateData.meditation_completed || 0,
          daily_points: dailyPoints,
          steps: updateData.steps || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning([
          'id', 'user_id', 'date', 'training_completed', 'nutrition_completed',
          'movement_completed', 'meditation_completed', 'daily_points', 'steps'
        ])
        .executeTakeFirst();
    }

    console.log('Daily habits updated successfully:', result);
    res.json(result);
  } catch (error) {
    console.error('Error updating daily habits:', error);
    await SystemLogger.logCriticalError('Daily habits update error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar hábitos diarios');
  }
});

export default router;
