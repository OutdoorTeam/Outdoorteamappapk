import express from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { SystemLogger } from '../utils/logging.js';
import { ERROR_CODES, sendErrorResponse } from '../utils/validation.js';

const router = express.Router();

// Get user permissions
router.get('/users/:id/permissions', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    console.log('Admin fetching permissions for user:', userId);

    const permissions = await db
      .selectFrom('user_permissions')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!permissions) {
      // Create default permissions if none exist
      const defaultPermissions = await db
        .insertInto('user_permissions')
        .values({
          user_id: userId,
          dashboard_enabled: 1,
          training_enabled: 1,
          nutrition_enabled: 1,
          meditation_enabled: 1,
          active_breaks_enabled: 1,
          exercises_enabled: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'dashboard_enabled', 'training_enabled', 'nutrition_enabled', 'meditation_enabled', 'active_breaks_enabled', 'exercises_enabled'])
        .executeTakeFirst();

      res.json(defaultPermissions);
      return;
    }

    res.json(permissions);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    await SystemLogger.logCriticalError('User permissions fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener permisos del usuario');
  }
});

// Update user permissions
router.put('/users/:id/permissions', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const {
      dashboard_enabled,
      training_enabled,
      nutrition_enabled,
      meditation_enabled,
      active_breaks_enabled,
      exercises_enabled
    } = req.body;

    console.log('Admin updating permissions for user:', userId, 'data:', req.body);

    const updatedPermissions = await db
      .updateTable('user_permissions')
      .set({
        dashboard_enabled: dashboard_enabled ? 1 : 0,
        training_enabled: training_enabled ? 1 : 0,
        nutrition_enabled: nutrition_enabled ? 1 : 0,
        meditation_enabled: meditation_enabled ? 1 : 0,
        active_breaks_enabled: active_breaks_enabled ? 1 : 0,
        exercises_enabled: exercises_enabled ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('user_id', '=', userId)
      .returning(['id', 'user_id', 'dashboard_enabled', 'training_enabled', 'nutrition_enabled', 'meditation_enabled', 'active_breaks_enabled', 'exercises_enabled'])
      .executeTakeFirst();

    if (!updatedPermissions) {
      // Create if doesn't exist
      const newPermissions = await db
        .insertInto('user_permissions')
        .values({
          user_id: userId,
          dashboard_enabled: dashboard_enabled ? 1 : 0,
          training_enabled: training_enabled ? 1 : 0,
          nutrition_enabled: nutrition_enabled ? 1 : 0,
          meditation_enabled: meditation_enabled ? 1 : 0,
          active_breaks_enabled: active_breaks_enabled ? 1 : 0,
          exercises_enabled: exercises_enabled ? 1 : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'dashboard_enabled', 'training_enabled', 'nutrition_enabled', 'meditation_enabled', 'active_breaks_enabled', 'exercises_enabled'])
        .executeTakeFirst();

      res.json(newPermissions);
      return;
    }

    await SystemLogger.log('info', 'User permissions updated', {
      userId: req.user.id,
      metadata: { target_user_id: userId, permissions: req.body }
    });

    res.json(updatedPermissions);
  } catch (error) {
    console.error('Error updating user permissions:', error);
    await SystemLogger.logCriticalError('User permissions update error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar permisos del usuario');
  }
});

// Get user goals
router.get('/users/:id/goals', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    console.log('Admin fetching goals for user:', userId);

    const goals = await db
      .selectFrom('user_goals')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!goals) {
      // Create default goals if none exist
      const defaultGoals = await db
        .insertInto('user_goals')
        .values({
          user_id: userId,
          daily_steps_goal: 8000,
          weekly_points_goal: 28,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'daily_steps_goal', 'weekly_points_goal'])
        .executeTakeFirst();

      res.json(defaultGoals);
      return;
    }

    res.json(goals);
  } catch (error) {
    console.error('Error fetching user goals:', error);
    await SystemLogger.logCriticalError('User goals fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener metas del usuario');
  }
});

// Update user goals
router.put('/users/:id/goals', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { daily_steps_goal, weekly_points_goal } = req.body;

    console.log('Admin updating goals for user:', userId, 'data:', req.body);

    // Validate input
    if (daily_steps_goal && (daily_steps_goal < 1000 || daily_steps_goal > 50000)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'La meta de pasos debe estar entre 1,000 y 50,000');
      return;
    }

    if (weekly_points_goal && (weekly_points_goal < 7 || weekly_points_goal > 100)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'La meta semanal debe estar entre 7 y 100 puntos');
      return;
    }

    const updatedGoals = await db
      .updateTable('user_goals')
      .set({
        daily_steps_goal: daily_steps_goal || 8000,
        weekly_points_goal: weekly_points_goal || 28,
        updated_at: new Date().toISOString()
      })
      .where('user_id', '=', userId)
      .returning(['id', 'user_id', 'daily_steps_goal', 'weekly_points_goal'])
      .executeTakeFirst();

    if (!updatedGoals) {
      // Create if doesn't exist
      const newGoals = await db
        .insertInto('user_goals')
        .values({
          user_id: userId,
          daily_steps_goal: daily_steps_goal || 8000,
          weekly_points_goal: weekly_points_goal || 28,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'daily_steps_goal', 'weekly_points_goal'])
        .executeTakeFirst();

      res.json(newGoals);
      return;
    }

    await SystemLogger.log('info', 'User goals updated', {
      userId: req.user.id,
      metadata: { target_user_id: userId, goals: req.body }
    });

    res.json(updatedGoals);
  } catch (error) {
    console.error('Error updating user goals:', error);
    await SystemLogger.logCriticalError('User goals update error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar metas del usuario');
  }
});

// Get user's today habits (admin view)
router.get('/users/:id/today-habits', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const today = new Date().toISOString().split('T')[0];

    console.log('Admin fetching today habits for user:', userId, 'date:', today);

    const todayHabits = await db
      .selectFrom('daily_habits')
      .selectAll()
      .where('user_id', '=', userId)
      .where('date', '=', today)
      .executeTakeFirst();

    if (todayHabits) {
      res.json(todayHabits);
    } else {
      // Return default values if no record exists
      res.json({
        user_id: userId,
        date: today,
        training_completed: 0,
        nutrition_completed: 0,
        movement_completed: 0,
        meditation_completed: 0,
        daily_points: 0,
        steps: 0
      });
    }
  } catch (error) {
    console.error('Error fetching user today habits:', error);
    await SystemLogger.logCriticalError('User today habits fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener hábitos del usuario');
  }
});

// Get user's step history
router.get('/users/:id/step-history', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { days = 30 } = req.query;
    
    const daysBack = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];

    console.log('Admin fetching step history for user:', userId, 'from:', startDateStr);

    const stepHistory = await db
      .selectFrom('daily_habits')
      .select(['date', 'steps', 'movement_completed', 'daily_points'])
      .where('user_id', '=', userId)
      .where('date', '>=', startDateStr)
      .orderBy('date', 'desc')
      .execute();

    res.json(stepHistory);
  } catch (error) {
    console.error('Error fetching user step history:', error);
    await SystemLogger.logCriticalError('User step history fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener historial de pasos del usuario');
  }
});

export default router;
