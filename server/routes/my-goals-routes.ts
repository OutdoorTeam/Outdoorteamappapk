import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Get current user's goals
router.get('/my-goals', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    console.log('Fetching goals for user:', userId);

    let goals = await db
      .selectFrom('user_goals')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!goals) {
      // Create default goals if none exist
      goals = await db
        .insertInto('user_goals')
        .values({
          user_id: userId,
          daily_steps_goal: 8000,
          weekly_points_goal: 28,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'daily_steps_goal', 'weekly_points_goal', 'created_at', 'updated_at'])
        .executeTakeFirst();
    }

    console.log('User goals fetched:', goals);
    res.json(goals);
  } catch (error) {
    console.error('Error fetching user goals:', error);
    await SystemLogger.logCriticalError('User goals fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener metas del usuario');
  }
});

// Update current user's goals
router.put('/my-goals', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { daily_steps_goal, weekly_points_goal } = req.body;

    console.log('Updating goals for user:', userId, 'data:', req.body);

    // Validate inputs
    if (daily_steps_goal !== undefined && (daily_steps_goal < 1000 || daily_steps_goal > 50000)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Meta de pasos debe estar entre 1,000 y 50,000');
      return;
    }

    if (weekly_points_goal !== undefined && (weekly_points_goal < 7 || weekly_points_goal > 100)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Meta semanal debe estar entre 7 y 100 puntos');
      return;
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (daily_steps_goal !== undefined) {
      updateData.daily_steps_goal = daily_steps_goal;
    }

    if (weekly_points_goal !== undefined) {
      updateData.weekly_points_goal = weekly_points_goal;
    }

    // Check if goals exist
    const existingGoals = await db
      .selectFrom('user_goals')
      .select(['id'])
      .where('user_id', '=', userId)
      .executeTakeFirst();

    let result;
    if (existingGoals) {
      // Update existing goals
      result = await db
        .updateTable('user_goals')
        .set(updateData)
        .where('user_id', '=', userId)
        .returning(['id', 'user_id', 'daily_steps_goal', 'weekly_points_goal', 'created_at', 'updated_at'])
        .executeTakeFirst();
    } else {
      // Create new goals
      result = await db
        .insertInto('user_goals')
        .values({
          user_id: userId,
          daily_steps_goal: daily_steps_goal || 8000,
          weekly_points_goal: weekly_points_goal || 28,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id', 'user_id', 'daily_steps_goal', 'weekly_points_goal', 'created_at', 'updated_at'])
        .executeTakeFirst();
    }

    console.log('User goals updated successfully:', result);
    await SystemLogger.log('info', 'User goals updated', {
      userId: req.user.id,
      metadata: { 
        daily_steps_goal: result?.daily_steps_goal,
        weekly_points_goal: result?.weekly_points_goal
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating user goals:', error);
    await SystemLogger.logCriticalError('User goals update error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar metas del usuario');
  }
});

export default router;
