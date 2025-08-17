import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Get nutrition plan for a user
router.get('/nutrition-plan/:userId', authenticateToken, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Users can only access their own plans unless they're admin
    if (requestingUserRole !== 'admin' && parseInt(userId) !== requestingUserId) {
      sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
      return;
    }

    console.log('Fetching nutrition plan for user:', userId);

    // Get the latest published plan, or draft if admin
    let query = db
      .selectFrom('nutrition_plans')
      .selectAll()
      .where('user_id', '=', parseInt(userId));

    if (requestingUserRole === 'admin') {
      // Admin sees latest version regardless of status
      query = query.orderBy('version', 'desc').orderBy('updated_at', 'desc');
    } else {
      // Users see only published plans
      query = query.where('status', '=', 'published').orderBy('version', 'desc');
    }

    const nutritionPlan = await query.executeTakeFirst();

    // Also get legacy PDF if exists
    const legacyPdf = await db
      .selectFrom('user_files')
      .selectAll()
      .where('user_id', '=', parseInt(userId))
      .where('file_type', '=', 'nutrition')
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    res.json({
      plan: nutritionPlan || null,
      legacyPdf: legacyPdf || null
    });
  } catch (error) {
    console.error('Error fetching nutrition plan:', error);
    await SystemLogger.logCriticalError('Nutrition plan fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener plan nutricional');
  }
});

// Upsert nutrition plan (admin only)
router.put('/nutrition-plan/:userId', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { content_md, status = 'draft' } = req.body;
    const adminId = req.user.id;

    console.log('Upserting nutrition plan for user:', userId, 'status:', status);

    // Validate inputs
    if (status && !['draft', 'published'].includes(status)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Estado inválido');
      return;
    }

    // Get current plan to determine version
    const currentPlan = await db
      .selectFrom('nutrition_plans')
      .selectAll()
      .where('user_id', '=', parseInt(userId))
      .orderBy('version', 'desc')
      .executeTakeFirst();

    const now = new Date().toISOString();
    let newVersion = 1;

    // If publishing, increment version
    if (status === 'published' && currentPlan) {
      newVersion = currentPlan.version + 1;
    } else if (currentPlan && currentPlan.status === 'draft') {
      // Update existing draft
      newVersion = currentPlan.version;
    } else if (currentPlan) {
      // Create new draft based on latest
      newVersion = currentPlan.version;
    }

    const planData = {
      user_id: parseInt(userId),
      content_md: content_md || null,
      version: newVersion,
      status,
      created_by: adminId,
      updated_at: now
    };

    let result;

    if (currentPlan && currentPlan.status === 'draft' && status === 'draft') {
      // Update existing draft
      result = await db
        .updateTable('nutrition_plans')
        .set({
          content_md: content_md || null,
          updated_at: now
        })
        .where('id', '=', currentPlan.id)
        .returning(['id', 'version', 'status'])
        .executeTakeFirst();
    } else {
      // Create new version
      result = await db
        .insertInto('nutrition_plans')
        .values({
          ...planData,
          created_at: now
        })
        .returning(['id', 'version', 'status'])
        .executeTakeFirst();
    }

    await SystemLogger.log('info', 'Nutrition plan updated', {
      userId: adminId,
      metadata: { target_user_id: parseInt(userId), status, version: result?.version }
    });

    res.json(result);
  } catch (error) {
    console.error('Error upserting nutrition plan:', error);
    await SystemLogger.logCriticalError('Nutrition plan upsert error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar plan nutricional');
  }
});

export default router;
