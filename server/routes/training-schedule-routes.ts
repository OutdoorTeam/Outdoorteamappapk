import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

const router = Router();

// Get user's active training schedule - fixed route path for user access
router.get('/users/:userId/training-schedule', authenticateToken, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // For user's own schedule, support "me" as userId
    const targetUserId = userId === 'me' ? requestingUserId : parseInt(userId);

    // Users can only view their own schedule unless admin
    if (!isAdmin && targetUserId !== requestingUserId) {
      sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado');
      return;
    }

    console.log('Fetching training schedule for user:', targetUserId);

    // Get active training schedule
    const schedule = await db
      .selectFrom('training_plan_schedules')
      .selectAll()
      .where('user_id', '=', targetUserId)
      .where('status', '=', 'active')
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    if (!schedule) {
      res.json({ schedule: null, exercises: {} });
      return;
    }

    // Get exercises for this schedule grouped by day
    const exercises = await db
      .selectFrom('training_plan_exercises as tpe')
      .leftJoin('content_library as cl', 'tpe.content_library_id', 'cl.id')
      .select([
        'tpe.id',
        'tpe.day_name',
        'tpe.exercise_name',
        'tpe.content_library_id',
        'tpe.video_url',
        'tpe.sets',
        'tpe.reps',
        'tpe.rest_seconds',
        'tpe.intensity',
        'tpe.notes',
        'tpe.sort_order',
        'cl.title as library_title',
        'cl.video_url as library_video_url'
      ])
      .where('tpe.schedule_id', '=', schedule.id)
      .orderBy(['tpe.day_name', 'tpe.sort_order'])
      .execute();

    // Group exercises by day
    const exercisesByDay = exercises.reduce((acc, exercise) => {
      if (!acc[exercise.day_name]) {
        acc[exercise.day_name] = [];
      }
      acc[exercise.day_name].push({
        id: exercise.id,
        exercise_name: exercise.exercise_name,
        content_library_id: exercise.content_library_id,
        video_url: exercise.video_url || exercise.library_video_url,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_seconds: exercise.rest_seconds,
        intensity: exercise.intensity,
        notes: exercise.notes,
        sort_order: exercise.sort_order,
        library_title: exercise.library_title
      });
      return acc;
    }, {} as Record<string, any[]>);

    res.json({
      schedule,
      exercises: exercisesByDay
    });

  } catch (error) {
    console.error('Error fetching training schedule:', error);
    await SystemLogger.logCriticalError('Training schedule fetch error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener cronograma de entrenamiento');
  }
});

// Create or update training schedule (admin only)
router.post('/users/:userId/training-schedule', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { plan_title, exercises_by_day } = req.body;

    console.log('Creating training schedule for user:', userId, 'Title:', plan_title);

    // Validate required fields
    if (!plan_title || !exercises_by_day) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Título del plan y ejercicios son requeridos');
      return;
    }

    // Check if user exists
    const user = await db
      .selectFrom('users')
      .select(['id', 'email'])
      .where('id', '=', parseInt(userId))
      .executeTakeFirst();

    if (!user) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Usuario no encontrado');
      return;
    }

    await db.transaction().execute(async (trx) => {
      // Deactivate existing schedules
      await trx
        .updateTable('training_plan_schedules')
        .set({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .where('user_id', '=', parseInt(userId))
        .where('status', '=', 'active')
        .execute();

      // Create new schedule
      const schedule = await trx
        .insertInto('training_plan_schedules')
        .values({
          user_id: parseInt(userId),
          plan_title,
          week_number: 1,
          status: 'active',
          created_by: req.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning(['id'])
        .executeTakeFirst();

      if (!schedule) {
        throw new Error('Error al crear cronograma');
      }

      // Insert exercises for each day
      const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      
      for (const dayName of dayNames) {
        const dayExercises = exercises_by_day[dayName] || [];
        
        for (let i = 0; i < dayExercises.length; i++) {
          const exercise = dayExercises[i];
          
          await trx
            .insertInto('training_plan_exercises')
            .values({
              schedule_id: schedule.id,
              day_name: dayName,
              exercise_name: exercise.exercise_name || `Ejercicio ${i + 1}`,
              content_library_id: exercise.content_library_id || null,
              video_url: exercise.video_url || null,
              sets: exercise.sets || null,
              reps: exercise.reps || null,
              rest_seconds: exercise.rest_seconds || null,
              intensity: exercise.intensity || null,
              notes: exercise.notes || null,
              sort_order: i
            })
            .execute();
        }
      }
    });

    console.log('Training schedule created successfully for user:', userId);
    await SystemLogger.log('info', 'Training schedule created', {
      userId: req.user.id,
      metadata: { 
        target_user_id: parseInt(userId),
        plan_title
      }
    });

    res.status(201).json({ message: 'Cronograma de entrenamiento creado exitosamente' });

  } catch (error) {
    console.error('Error creating training schedule:', error);
    await SystemLogger.logCriticalError('Training schedule creation error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al crear cronograma de entrenamiento');
  }
});

// Update specific exercise
router.put('/training-exercises/:exerciseId', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { exerciseId } = req.params;
    const updateData = req.body;

    console.log('Updating training exercise:', exerciseId);

    // Prepare update fields
    const allowedFields = ['exercise_name', 'content_library_id', 'video_url', 'sets', 'reps', 'rest_seconds', 'intensity', 'notes'];
    const updateFields: any = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'No hay campos para actualizar');
      return;
    }

    const updatedExercise = await db
      .updateTable('training_plan_exercises')
      .set(updateFields)
      .where('id', '=', parseInt(exerciseId))
      .returning(['id', 'exercise_name'])
      .executeTakeFirst();

    if (!updatedExercise) {
      sendErrorResponse(res, ERROR_CODES.NOT_FOUND_ERROR, 'Ejercicio no encontrado');
      return;
    }

    console.log('Exercise updated successfully:', updatedExercise.exercise_name);
    await SystemLogger.log('info', 'Training exercise updated', {
      userId: req.user.id,
      metadata: { 
        exercise_id: parseInt(exerciseId),
        exercise_name: updatedExercise.exercise_name
      }
    });

    res.json(updatedExercise);

  } catch (error) {
    console.error('Error updating training exercise:', error);
    await SystemLogger.logCriticalError('Training exercise update error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar ejercicio');
  }
});

// Delete exercise
router.delete('/training-exercises/:exerciseId', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { exerciseId } = req.params;

    console.log('Deleting training exercise:', exerciseId);

    await db
      .deleteFrom('training_plan_exercises')
      .where('id', '=', parseInt(exerciseId))
      .execute();

    console.log('Exercise deleted successfully');
    await SystemLogger.log('info', 'Training exercise deleted', {
      userId: req.user.id,
      metadata: { exercise_id: parseInt(exerciseId) }
    });

    res.json({ message: 'Ejercicio eliminado exitosamente' });

  } catch (error) {
    console.error('Error deleting training exercise:', error);
    await SystemLogger.logCriticalError('Training exercise deletion error', error as Error, { userId: req.user?.id });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al eliminar ejercicio');
  }
});

export default router;
