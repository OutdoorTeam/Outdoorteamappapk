import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';
import AchievementService from '../services/achievement-service.js';
import { sql } from 'kysely';

const router = Router();

// Get user achievements
router.get('/user-achievements', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching achievements for user:', userId);

    // Update achievements first
    await AchievementService.checkAndUpdateAchievements(userId);

    // Get achievements with progress
    const achievements = await AchievementService.getUserAchievements(userId);
    const stats = await AchievementService.getAchievementStats(userId);

    res.json({
      achievements,
      stats
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    await SystemLogger.logCriticalError('User achievements fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener logros');
  }
});

// Get leaderboard - Steps (global)
router.get('/leaderboard/steps', authenticateToken, async (req: any, res) => {
  try {
    const { month } = req.query;
    const currentUserId = req.user.id;
    
    // Default to current month if not specified
    const targetMonth = month || new Date().toISOString().substring(0, 7); // YYYY-MM format
    const startDate = `${targetMonth}-01`;
    const nextMonth = new Date(startDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().substring(0, 10);

    console.log('Fetching steps leaderboard for month:', targetMonth);

    const leaderboard = await db
      .selectFrom('daily_habits')
      .innerJoin('users', 'daily_habits.user_id', 'users.id')
      .select([
        'users.id as user_id',
        'users.full_name',
        'users.email'
      ])
      .select((eb) => [eb.fn.sum('daily_habits.steps').as('total_steps')])
      .where('daily_habits.date', '>=', startDate)
      .where('daily_habits.date', '<', endDate)
      .where('users.is_active', '=', 1)
      .groupBy(['users.id', 'users.full_name', 'users.email'])
      .orderBy('total_steps', 'desc')
      .limit(100)
      .execute();

    // Add position and format
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      position: index + 1,
      user_id: entry.user_id,
      full_name: entry.full_name,
      total_steps: Number(entry.total_steps || 0),
      is_current_user: entry.user_id === currentUserId
    }));

    // Find current user's position if not in top 100
    let currentUserPosition = formattedLeaderboard.find(entry => entry.is_current_user);
    if (!currentUserPosition) {
      const userStats = await db
        .selectFrom('daily_habits')
        .select((eb) => [eb.fn.sum('steps').as('total_steps')])
        .where('user_id', '=', currentUserId)
        .where('date', '>=', startDate)
        .where('date', '<', endDate)
        .executeTakeFirst();

      const userStepsCount = Number(userStats?.total_steps || 0);
      
      // Count how many users have more steps
      const usersAboveCount = await db
        .selectFrom('daily_habits')
        .innerJoin('users', 'daily_habits.user_id', 'users.id')
        .select((eb) => [
          eb.fn.sum('daily_habits.steps').as('user_total'),
          'users.id'
        ])
        .where('daily_habits.date', '>=', startDate)
        .where('daily_habits.date', '<', endDate)
        .where('users.is_active', '=', 1)
        .groupBy(['users.id'])
        .having((eb) => eb('user_total', '>', userStepsCount))
        .execute();

      currentUserPosition = {
        position: usersAboveCount.length + 1,
        user_id: currentUserId,
        full_name: req.user.full_name,
        total_steps: userStepsCount,
        is_current_user: true
      };
    }

    res.json({
      leaderboard: formattedLeaderboard,
      current_user: currentUserPosition,
      month: targetMonth
    });
  } catch (error) {
    console.error('Error fetching steps leaderboard:', error);
    await SystemLogger.logCriticalError('Steps leaderboard fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener ranking de pasos');
  }
});

// Get leaderboard - Habit Points (Totum members only)
router.get('/leaderboard/habits', authenticateToken, async (req: any, res) => {
  try {
    const { month } = req.query;
    const currentUserId = req.user.id;
    
    // Default to current month if not specified
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const startDate = `${targetMonth}-01`;
    const nextMonth = new Date(startDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().substring(0, 10);

    console.log('Fetching habits leaderboard for month:', targetMonth);

    const leaderboard = await db
      .selectFrom('daily_habits')
      .innerJoin('users', 'daily_habits.user_id', 'users.id')
      .select([
        'users.id as user_id',
        'users.full_name',
        'users.email',
        'users.plan_type'
      ])
      .select((eb) => [eb.fn.sum('daily_habits.daily_points').as('total_points')])
      .where('daily_habits.date', '>=', startDate)
      .where('daily_habits.date', '<', endDate)
      .where('users.is_active', '=', 1)
      .where('users.plan_type', '=', 'Programa Totum') // Only Totum members
      .groupBy(['users.id', 'users.full_name', 'users.email', 'users.plan_type'])
      .orderBy('total_points', 'desc')
      .limit(100)
      .execute();

    // Add position and format
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      position: index + 1,
      user_id: entry.user_id,
      full_name: entry.full_name,
      total_points: Number(entry.total_points || 0),
      is_current_user: entry.user_id === currentUserId
    }));

    // Find current user's position if not in top 100
    let currentUserPosition = formattedLeaderboard.find(entry => entry.is_current_user);
    if (!currentUserPosition && req.user.plan_type === 'Programa Totum') {
      const userStats = await db
        .selectFrom('daily_habits')
        .select((eb) => [eb.fn.sum('daily_points').as('total_points')])
        .where('user_id', '=', currentUserId)
        .where('date', '>=', startDate)
        .where('date', '<', endDate)
        .executeTakeFirst();

      const userPointsCount = Number(userStats?.total_points || 0);
      
      // Count how many Totum users have more points
      const usersAboveCount = await db
        .selectFrom('daily_habits')
        .innerJoin('users', 'daily_habits.user_id', 'users.id')
        .select((eb) => [
          eb.fn.sum('daily_habits.daily_points').as('user_total'),
          'users.id'
        ])
        .where('daily_habits.date', '>=', startDate)
        .where('daily_habits.date', '<', endDate)
        .where('users.is_active', '=', 1)
        .where('users.plan_type', '=', 'Programa Totum')
        .groupBy(['users.id'])
        .having((eb) => eb('user_total', '>', userPointsCount))
        .execute();

      currentUserPosition = {
        position: usersAboveCount.length + 1,
        user_id: currentUserId,
        full_name: req.user.full_name,
        total_points: userPointsCount,
        is_current_user: true
      };
    }

    res.json({
      leaderboard: formattedLeaderboard,
      current_user: currentUserPosition,
      month: targetMonth,
      is_eligible: req.user.plan_type === 'Programa Totum'
    });
  } catch (error) {
    console.error('Error fetching habits leaderboard:', error);
    await SystemLogger.logCriticalError('Habits leaderboard fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener ranking de hábitos');
  }
});

// Admin routes for achievement management
router.get('/admin/achievements', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    console.log('Admin fetching all achievements');
    
    const achievements = await db
      .selectFrom('achievements')
      .selectAll()
      .orderBy('category', 'asc')
      .orderBy('created_at', 'desc')
      .execute();

    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements for admin:', error);
    await SystemLogger.logCriticalError('Admin achievements fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener logros');
  }
});

router.post('/admin/achievements', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { name, description, type, category, goal_value, icon_url } = req.body;
    
    if (!name || !description || !type || !category || !goal_value) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Todos los campos requeridos deben estar presentes');
      return;
    }

    console.log('Admin creating achievement:', name);

    const achievement = await db
      .insertInto('achievements')
      .values({
        name: name.trim(),
        description: description.trim(),
        type,
        category,
        goal_value: parseInt(goal_value),
        icon_url: icon_url?.trim() || null,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning(['id', 'name', 'category'])
      .executeTakeFirst();

    await SystemLogger.log('info', 'Achievement created', {
      userId: req.user.id,
      req,
      metadata: { achievement_id: achievement?.id, name, category }
    });

    res.status(201).json(achievement);
  } catch (error) {
    console.error('Error creating achievement:', error);
    await SystemLogger.logCriticalError('Achievement creation error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al crear logro');
  }
});

router.put('/admin/achievements/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, category, goal_value, icon_url, is_active } = req.body;

    console.log('Admin updating achievement:', id);

    const updated = await db
      .updateTable('achievements')
      .set({
        name: name?.trim(),
        description: description?.trim(),
        type,
        category,
        goal_value: goal_value ? parseInt(goal_value) : undefined,
        icon_url: icon_url?.trim(),
        is_active: is_active !== undefined ? (is_active ? 1 : 0) : undefined,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'category'])
      .executeTakeFirst();

    if (!updated) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Logro no encontrado');
      return;
    }

    await SystemLogger.log('info', 'Achievement updated', {
      userId: req.user.id,
      req,
      metadata: { achievement_id: parseInt(id), name }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating achievement:', error);
    await SystemLogger.logCriticalError('Achievement update error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar logro');
  }
});

router.delete('/admin/achievements/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    console.log('Admin deleting achievement:', id);

    const deleted = await db
      .deleteFrom('achievements')
      .where('id', '=', parseInt(id))
      .returning(['id', 'name'])
      .executeTakeFirst();

    if (!deleted) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Logro no encontrado');
      return;
    }

    await SystemLogger.log('info', 'Achievement deleted', {
      userId: req.user.id,
      req,
      metadata: { achievement_id: parseInt(id), name: deleted.name }
    });

    res.json({ message: 'Logro eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    await SystemLogger.logCriticalError('Achievement deletion error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al eliminar logro');
  }
});

export default router;
