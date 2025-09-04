import express from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { SystemLogger } from '../utils/logging.js';
import { ERROR_CODES, sendErrorResponse } from '../utils/validation.js';

const router = express.Router();

// Assign plan to user
router.post('/users/:id/assign-plan', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const { planId } = req.body;
    const userId = parseInt(id);

    console.log('Admin assigning plan', planId, 'to user', userId);

    const plan = await db
      .selectFrom('plans')
      .selectAll()
      .where('id', '=', planId)
      .executeTakeFirst();

    if (!plan) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Plan no encontrado');
      return;
    }

    await db
      .updateTable('users')
      .set({
        plan_type: plan.name,
        features_json: plan.features_json,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .execute();

    await SystemLogger.log('info', 'User plan assigned', {
      userId: req.user.id,
      metadata: { target_user_id: userId, plan_id: planId, plan_name: plan.name }
    });

    res.json({ message: 'Plan asignado correctamente' });
  } catch (error) {
    console.error('Error assigning plan:', error);
    await SystemLogger.logCriticalError('Plan assignment error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al asignar el plan');
  }
});

// Toggle user status
router.put('/users/:id/status', authenticateToken, requireAdmin, async (req: any, res: express.Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const userId = parseInt(id);

    console.log('Admin toggling status for user:', userId, 'to', is_active);

    await db
      .updateTable('users')
      .set({
        is_active: is_active ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .execute();

    await SystemLogger.log('info', 'User status toggled', {
      userId: req.user.id,
      metadata: { target_user_id: userId, is_active }
    });

    res.json({ message: 'Estado del usuario actualizado' });
  } catch (error) {
    console.error('Error toggling user status:', error);
    await SystemLogger.logCriticalError('User status toggle error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al cambiar estado del usuario');
  }
});

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

export default router;
