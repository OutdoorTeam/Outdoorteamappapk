import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Get training plan for a user with days and exercises
router.get('/training-plan/:userId', authenticateToken, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Users can only access their own plans unless they're admin
    if (requestingUserRole !== 'admin' && parseInt(userId) !== requestingUserId) {
      sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
      return;
    }

    console.log('Fetching training plan for user:', userId);

    // Get the latest published plan, or draft if admin
    let planQuery = db
      .selectFrom('training_plans')
      .selectAll()
      .where('user_id', '=', parseInt(userId));

    if (requestingUserRole === 'admin') {
      planQuery = planQuery.orderBy('version', 'desc').orderBy('updated_at', 'desc');
    } else {
      planQuery = planQuery.where('status', '=', 'published').orderBy('version', 'desc');
    }

    const trainingPlan = await planQuery.executeTakeFirst();

    if (!trainingPlan) {
      // Also check for legacy PDF
      const legacyPdf = await db
        .selectFrom('user_files')
        .selectAll()
        .where('user_id', '=', parseInt(userId))
        .where('file_type', '=', 'training')
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      res.json({
        plan: null,
        days: [],
        legacyPdf: legacyPdf || null
      });
      return;
    }

    // Get plan days
    const days = await db
      .selectFrom('training_plan_days')
      .selectAll()
      .where('plan_id', '=', trainingPlan.id)
      .orderBy('sort_order')
      .orderBy('day_index')
      .execute();

    // Get exercises for each day
    const daysWithExercises = await Promise.all(
      days.map(async (day) => {
        const exercises = await db
          .selectFrom('training_exercises')
          .leftJoin('content_library', 'training_exercises.content_library_id', 'content_library.id')
          .select([
            'training_exercises.id',
            'training_exercises.sort_order',
            'training_exercises.exercise_name',
            'training_exercises.content_library_id',
            'training_exercises.youtube_url',
            'training_exercises.sets',
            'training_exercises.reps',
            'training_exercises.intensity',
            'training_exercises.rest_seconds',
            'training_exercises.tempo',
            'training_exercises.notes',
            'content_library.title as content_title',
            'content_library.video_url as content_video_url'
          ])
          .where('training_exercises.day_id', '=', day.id)
          .orderBy('training_exercises.sort_order')
          .execute();

        return {
          ...day,
          exercises
        };
      })
    );

    // Check for legacy PDF
    const legacyPdf = await db
      .selectFrom('user_files')
      .selectAll()
      .where('user_id', '=', parseInt(userId))
      .where('file_type', '=', 'training')
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    res.json({
      plan: trainingPlan,
      days: daysWithExercises,
      legacyPdf: legacyPdf || null
    });
  } catch (error) {
    console.error('Error fetching training plan:', error);
    await SystemLogger.logCriticalError('Training plan fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener plan de entrenamiento');
  }
});

// Create or get draft training plan (admin only)
router.post('/training-plan/:userId/draft', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    console.log('Creating/getting draft training plan for user:', userId);

    // Check if draft already exists
    const existingDraft = await db
      .selectFrom('training_plans')
      .selectAll()
      .where('user_id', '=', parseInt(userId))
      .where('status', '=', 'draft')
      .executeTakeFirst();

    if (existingDraft) {
      res.json(existingDraft);
      return;
    }

    // Get latest version number
    const latestPlan = await db
      .selectFrom('training_plans')
      .selectAll()
      .where('user_id', '=', parseInt(userId))
      .orderBy('version', 'desc')
      .executeTakeFirst();

    const now = new Date().toISOString();
    const newVersion = latestPlan ? latestPlan.version : 1;

    const newDraft = await db
      .insertInto('training_plans')
      .values({
        user_id: parseInt(userId),
        title: `Plan de Entrenamiento v${newVersion}`,
        version: newVersion,
        status: 'draft',
        created_by: adminId,
        created_at: now,
        updated_at: now
      })
      .returning(['id', 'title', 'version', 'status'])
      .executeTakeFirst();

    await SystemLogger.log('info', 'Training plan draft created', {
      userId: adminId,
      metadata: { target_user_id: parseInt(userId), plan_id: newDraft?.id }
    });

    res.json(newDraft);
  } catch (error) {
    console.error('Error creating draft training plan:', error);
    await SystemLogger.logCriticalError('Training plan draft creation error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al crear borrador del plan');
  }
});

// Ensure draft training plan exists (admin only) - NEW ROUTE
router.post('/training-plan/user/:userId/ensure-draft', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    console.log('Ensuring draft training plan exists for user:', userId);

    // Check if draft already exists
    const existingDraft = await db
      .selectFrom('training_plans')
      .selectAll()
      .where('user_id', '=', parseInt(userId))
      .where('status', '=', 'draft')
      .executeTakeFirst();

    if (existingDraft) {
      res.json(existingDraft);
      return;
    }

    // Get latest version number
    const latestPlan = await db
      .selectFrom('training_plans')
      .selectAll()
      .where('user_id', '=', parseInt(userId))
      .orderBy('version', 'desc')
      .executeTakeFirst();

    const now = new Date().toISOString();
    const newVersion = (latestPlan ? latestPlan.version : 0) + 1;

    const newDraft = await db
      .insertInto('training_plans')
      .values({
        user_id: parseInt(userId),
        title: `Plan de Entrenamiento v${newVersion}`,
        version: newVersion,
        status: 'draft',
        created_by: adminId,
        created_at: now,
        updated_at: now
      })
      .returning(['id', 'title', 'version', 'status'])
      .executeTakeFirst();

    await SystemLogger.log('info', 'Training plan draft ensured', {
      userId: adminId,
      metadata: { target_user_id: parseInt(userId), plan_id: newDraft?.id }
    });

    res.json(newDraft);
  } catch (error) {
    console.error('Error ensuring draft training plan:', error);
    await SystemLogger.logCriticalError('Training plan draft ensure error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al asegurar borrador del plan');
  }
});

// Update training plan metadata (admin only)
router.put('/training-plan/:planId', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { planId } = req.params;
    const { title, status } = req.body;

    console.log('Updating training plan:', planId);

    // Validate status
    if (status && !['draft', 'published'].includes(status)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Estado inválido');
      return;
    }

    const now = new Date().toISOString();
    let updateData: any = { updated_at: now };

    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;

    const result = await db
      .updateTable('training_plans')
      .set(updateData)
      .where('id', '=', parseInt(planId))
      .returning(['id', 'title', 'version', 'status'])
      .executeTakeFirst();

    if (!result) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Plan no encontrado');
      return;
    }

    await SystemLogger.log('info', 'Training plan updated', {
      userId: req.user.id,
      metadata: { plan_id: parseInt(planId), status }
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating training plan:', error);
    await SystemLogger.logCriticalError('Training plan update error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar plan');
  }
});

// Add or update training plan day (admin only)
router.post('/training-plan/:planId/days', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { planId } = req.params;
    const { day_index, title, notes, sort_order = 0 } = req.body;

    console.log('Adding/updating day for plan:', planId, 'day:', day_index);

    // Validate inputs
    if (!day_index || day_index < 1) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Índice de día inválido');
      return;
    }

    // Check if day already exists
    const existingDay = await db
      .selectFrom('training_plan_days')
      .selectAll()
      .where('plan_id', '=', parseInt(planId))
      .where('day_index', '=', day_index)
      .executeTakeFirst();

    let result;
    if (existingDay) {
      // Update existing day
      result = await db
        .updateTable('training_plan_days')
        .set({
          title: title || `Día ${day_index}`,
          notes: notes || null,
          sort_order
        })
        .where('id', '=', existingDay.id)
        .returning(['id', 'day_index', 'title', 'notes', 'sort_order'])
        .executeTakeFirst();
    } else {
      // Create new day
      result = await db
        .insertInto('training_plan_days')
        .values({
          plan_id: parseInt(planId),
          day_index,
          title: title || `Día ${day_index}`,
          notes: notes || null,
          sort_order
        })
        .returning(['id', 'day_index', 'title', 'notes', 'sort_order'])
        .executeTakeFirst();
    }

    res.json(result);
  } catch (error) {
    console.error('Error adding/updating training day:', error);
    await SystemLogger.logCriticalError('Training day update error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar día del plan');
  }
});

// Add or update exercise (admin only)
router.post('/training-plan/days/:dayId/exercises', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { dayId } = req.params;
    const {
      id,
      exercise_name,
      content_library_id,
      youtube_url,
      sets,
      reps,
      intensity,
      rest_seconds,
      tempo,
      notes,
      sort_order = 0
    } = req.body;

    console.log('Adding/updating exercise for day:', dayId);

    // Validate inputs
    if (!exercise_name?.trim()) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Nombre del ejercicio es requerido');
      return;
    }

    // Validate YouTube URL if provided
    if (youtube_url && !isValidYouTubeUrl(youtube_url)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'URL de YouTube inválida');
      return;
    }

    // Validate intensity
    const validIntensities = ['baja', 'media', 'alta', 'RPE6', 'RPE7', 'RPE8', 'RPE9', 'RPE10'];
    if (intensity && !validIntensities.includes(intensity)) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Intensidad inválida');
      return;
    }

    const exerciseData = {
      day_id: parseInt(dayId),
      exercise_name: exercise_name.trim(),
      content_library_id: content_library_id || null,
      youtube_url: youtube_url || null,
      sets: sets || null,
      reps: reps || null,
      intensity: intensity || null,
      rest_seconds: rest_seconds || null,
      tempo: tempo || null,
      notes: notes || null,
      sort_order
    };

    let result;
    if (id) {
      // Update existing exercise
      result = await db
        .updateTable('training_exercises')
        .set(exerciseData)
        .where('id', '=', id)
        .returning([
          'id', 'exercise_name', 'content_library_id', 'youtube_url',
          'sets', 'reps', 'intensity', 'rest_seconds', 'tempo', 'notes', 'sort_order'
        ])
        .executeTakeFirst();
    } else {
      // Create new exercise
      result = await db
        .insertInto('training_exercises')
        .values(exerciseData)
        .returning([
          'id', 'exercise_name', 'content_library_id', 'youtube_url',
          'sets', 'reps', 'intensity', 'rest_seconds', 'tempo', 'notes', 'sort_order'
        ])
        .executeTakeFirst();
    }

    res.json(result);
  } catch (error) {
    console.error('Error adding/updating exercise:', error);
    await SystemLogger.logCriticalError('Exercise update error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar ejercicio');
  }
});

// Publish training plan (admin only)
router.post('/training-plan/:planId/publish', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { planId } = req.params;

    console.log('Publishing training plan:', planId);

    // Get current plan
    const currentPlan = await db
      .selectFrom('training_plans')
      .selectAll()
      .where('id', '=', parseInt(planId))
      .executeTakeFirst();

    if (!currentPlan) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Plan no encontrado');
      return;
    }

    const now = new Date().toISOString();
    const newVersion = currentPlan.version + 1;

    // Update to published status with incremented version
    const result = await db
      .updateTable('training_plans')
      .set({
        status: 'published',
        version: newVersion,
        updated_at: now
      })
      .where('id', '=', parseInt(planId))
      .returning(['id', 'title', 'version', 'status'])
      .executeTakeFirst();

    await SystemLogger.log('info', 'Training plan published', {
      userId: req.user.id,
      metadata: { plan_id: parseInt(planId), version: newVersion }
    });

    res.json(result);
  } catch (error) {
    console.error('Error publishing training plan:', error);
    await SystemLogger.logCriticalError('Training plan publish error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al publicar plan');
  }
});

// Delete exercise (admin only)
router.delete('/training-plan/exercises/:exerciseId', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { exerciseId } = req.params;

    console.log('Deleting exercise:', exerciseId);

    await db
      .deleteFrom('training_exercises')
      .where('id', '=', parseInt(exerciseId))
      .execute();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    await SystemLogger.logCriticalError('Exercise deletion error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al eliminar ejercicio');
  }
});

// Helper function to validate YouTube URLs
function isValidYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') ||
      (urlObj.hostname === 'youtu.be')
    );
  } catch {
    return false;
  }
}

export default router;
