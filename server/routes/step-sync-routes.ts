import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES, validateRequest } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const googleFitAuthSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional()
});

const stepSyncDataSchema = z.object({
  steps: z.number().int().min(0, 'Steps must be non-negative'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  source: z.enum(['google_fit', 'apple_health']),
  timezone: z.string().optional()
});

const syncPreferencesSchema = z.object({
  googleFitEnabled: z.boolean().optional(),
  appleHealthEnabled: z.boolean().optional()
});

// Get user's step sync settings
router.get('/settings', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching step sync settings for user:', userId);

    let settings = await db
      .selectFrom('user_step_sync')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!settings) {
      // Create default settings
      settings = await db
        .insertInto('user_step_sync')
        .values({
          user_id: userId,
          google_fit_enabled: 0,
          apple_health_enabled: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning([
          'google_fit_enabled',
          'apple_health_enabled', 
          'last_sync_date',
          'last_sync_at',
          'sync_errors'
        ])
        .executeTakeFirst();
    }

    const response = {
      googleFitEnabled: Boolean(settings?.google_fit_enabled),
      appleHealthEnabled: Boolean(settings?.apple_health_enabled),
      hasGoogleFitToken: Boolean(settings?.google_fit_token),
      lastSyncDate: settings?.last_sync_date,
      lastSyncAt: settings?.last_sync_at,
      syncErrors: settings?.sync_errors
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching step sync settings:', error);
    await SystemLogger.logCriticalError('Step sync settings fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener configuración de sincronización');
  }
});

// Update step sync preferences
router.put('/settings', 
  authenticateToken, 
  validateRequest(syncPreferencesSchema),
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { googleFitEnabled, appleHealthEnabled } = req.body;
      
      console.log('Updating step sync settings for user:', userId, { googleFitEnabled, appleHealthEnabled });

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (googleFitEnabled !== undefined) {
        updateData.google_fit_enabled = googleFitEnabled ? 1 : 0;
        if (!googleFitEnabled) {
          updateData.google_fit_token = null;
          updateData.sync_errors = null;
        }
      }

      if (appleHealthEnabled !== undefined) {
        updateData.apple_health_enabled = appleHealthEnabled ? 1 : 0;
        if (!appleHealthEnabled) {
          updateData.apple_health_authorized = 0;
          updateData.sync_errors = null;
        }
      }

      // Check if record exists
      const existing = await db
        .selectFrom('user_step_sync')
        .select(['id'])
        .where('user_id', '=', userId)
        .executeTakeFirst();

      let result;
      if (existing) {
        result = await db
          .updateTable('user_step_sync')
          .set(updateData)
          .where('user_id', '=', userId)
          .returning([
            'google_fit_enabled',
            'apple_health_enabled',
            'last_sync_date',
            'last_sync_at'
          ])
          .executeTakeFirst();
      } else {
        result = await db
          .insertInto('user_step_sync')
          .values({
            user_id: userId,
            ...updateData,
            created_at: new Date().toISOString()
          })
          .returning([
            'google_fit_enabled',
            'apple_health_enabled',
            'last_sync_date',
            'last_sync_at'
          ])
          .executeTakeFirst();
      }

      await SystemLogger.log('info', 'Step sync settings updated', {
        userId,
        req,
        metadata: { googleFitEnabled, appleHealthEnabled }
      });

      const response = {
        googleFitEnabled: Boolean(result?.google_fit_enabled),
        appleHealthEnabled: Boolean(result?.apple_health_enabled),
        lastSyncDate: result?.last_sync_date,
        lastSyncAt: result?.last_sync_at
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating step sync settings:', error);
      await SystemLogger.logCriticalError('Step sync settings update error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar configuración de sincronización');
    }
  });

// Store Google Fit authorization
router.post('/google-fit/auth',
  authenticateToken,
  validateRequest(googleFitAuthSchema),
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { accessToken, refreshToken, expiresAt } = req.body;

      console.log('Storing Google Fit auth for user:', userId);

      const tokenData = {
        accessToken,
        refreshToken,
        expiresAt,
        authorizedAt: new Date().toISOString()
      };

      // Update user_step_sync with token
      await db
        .insertInto('user_step_sync')
        .values({
          user_id: userId,
          google_fit_enabled: 1,
          google_fit_token: JSON.stringify(tokenData),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .onConflict((oc) => oc
          .column('user_id')
          .doUpdateSet({
            google_fit_enabled: 1,
            google_fit_token: JSON.stringify(tokenData),
            updated_at: new Date().toISOString(),
            sync_errors: null
          })
        )
        .execute();

      await SystemLogger.log('info', 'Google Fit authorization stored', {
        userId,
        req,
        metadata: { hasRefreshToken: Boolean(refreshToken) }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error storing Google Fit auth:', error);
      await SystemLogger.logCriticalError('Google Fit auth storage error', error as Error, { userId: req.user?.id, req });
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar autorización de Google Fit');
    }
  });

// Store Apple Health authorization
router.post('/apple-health/auth', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('Storing Apple Health auth for user:', userId);

    // Update user_step_sync with Apple Health authorization
    await db
      .insertInto('user_step_sync')
      .values({
        user_id: userId,
        apple_health_enabled: 1,
        apple_health_authorized: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .onConflict((oc) => oc
        .column('user_id')
        .doUpdateSet({
          apple_health_enabled: 1,
          apple_health_authorized: 1,
          updated_at: new Date().toISOString(),
          sync_errors: null
        })
      )
      .execute();

    await SystemLogger.log('info', 'Apple Health authorization stored', {
      userId,
      req
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error storing Apple Health auth:', error);
    await SystemLogger.logCriticalError('Apple Health auth storage error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar autorización de Apple Health');
  }
});

// Sync step data from external sources
router.post('/sync-steps',
  authenticateToken,
  validateRequest(stepSyncDataSchema),
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { steps, date, source, timezone } = req.body;

      console.log(`Syncing ${steps} steps for user ${userId} on ${date} from ${source}`);

      // Check if user has this source enabled
      const syncSettings = await db
        .selectFrom('user_step_sync')
        .selectAll()
        .where('user_id', '=', userId)
        .executeTakeFirst();

      if (!syncSettings) {
        sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Sincronización no configurada');
        return;
      }

      const isGoogleFitEnabled = syncSettings.google_fit_enabled && source === 'google_fit';
      const isAppleHealthEnabled = syncSettings.apple_health_enabled && source === 'apple_health';

      if (!isGoogleFitEnabled && !isAppleHealthEnabled) {
        sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Fuente de datos no habilitada');
        return;
      }

      // Check existing step data for this date
      const existingSteps = await db
        .selectFrom('step_counts')
        .selectAll()
        .where('user_id', '=', userId)
        .where('date', '=', date)
        .executeTakeFirst();

      const currentTime = new Date().toISOString();
      let updatedSteps = steps;

      if (existingSteps) {
        // Only update if new value is higher (prevent overwriting manual corrections)
        if (existingSteps.source === 'manual' && steps < existingSteps.steps) {
          // Don't overwrite higher manual values with lower synced values
          updatedSteps = existingSteps.steps;
        } else if (steps > existingSteps.steps) {
          updatedSteps = steps;
        } else {
          updatedSteps = existingSteps.steps;
        }

        await db
          .updateTable('step_counts')
          .set({
            steps: updatedSteps,
            source: existingSteps.source === 'manual' ? 'manual' : source,
            synced_at: currentTime,
            timezone: timezone || existingSteps.timezone
          })
          .where('user_id', '=', userId)
          .where('date', '=', date)
          .execute();
      } else {
        // Create new record
        await db
          .insertInto('step_counts')
          .values({
            user_id: userId,
            steps: updatedSteps,
            date,
            source,
            synced_at: currentTime,
            timezone,
            created_at: currentTime
          })
          .execute();
      }

      // Update daily_habits with new step count
      const stepGoal = 8000; // This should match the dashboard goal
      const movementCompleted = updatedSteps >= stepGoal;

      await db
        .insertInto('daily_habits')
        .values({
          user_id: userId,
          date,
          steps: updatedSteps,
          movement_completed: movementCompleted ? 1 : 0,
          created_at: currentTime,
          updated_at: currentTime
        })
        .onConflict((oc) => oc
          .columns(['user_id', 'date'])
          .doUpdateSet({
            steps: updatedSteps,
            movement_completed: movementCompleted ? 1 : 0,
            updated_at: currentTime
          })
        )
        .execute();

      // Update sync timestamp
      await db
        .updateTable('user_step_sync')
        .set({
          last_sync_date: date,
          last_sync_at: currentTime,
          sync_errors: null,
          updated_at: currentTime
        })
        .where('user_id', '=', userId)
        .execute();

      await SystemLogger.log('info', 'Step data synced', {
        userId,
        req,
        metadata: { 
          steps: updatedSteps, 
          date, 
          source, 
          wasExisting: Boolean(existingSteps),
          movementCompleted 
        }
      });

      res.json({ 
        success: true, 
        steps: updatedSteps,
        movementCompleted,
        source: existingSteps?.source === 'manual' ? 'manual' : source
      });
    } catch (error) {
      console.error('Error syncing step data:', error);
      
      // Log sync error
      try {
        await db
          .updateTable('user_step_sync')
          .set({
            sync_errors: (error as Error).message,
            updated_at: new Date().toISOString()
          })
          .where('user_id', '=', req.user.id)
          .execute();
      } catch (logError) {
        console.error('Error logging sync error:', logError);
      }

      await SystemLogger.logCriticalError('Step sync error', error as Error, { 
        userId: req.user?.id, 
        req,
        metadata: { date: req.body?.date, source: req.body?.source }
      });
      
      sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al sincronizar datos de pasos');
    }
  });

// Get step sync history
router.get('/history', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { limit = 30 } = req.query;

    console.log('Fetching step sync history for user:', userId);

    const history = await db
      .selectFrom('step_counts')
      .select(['date', 'steps', 'source', 'synced_at', 'timezone'])
      .where('user_id', '=', userId)
      .where('source', 'in', ['google_fit', 'apple_health'])
      .orderBy('date', 'desc')
      .limit(parseInt(limit as string))
      .execute();

    res.json(history);
  } catch (error) {
    console.error('Error fetching step sync history:', error);
    await SystemLogger.logCriticalError('Step sync history fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener historial de sincronización');
  }
});

// Force sync (for testing/manual trigger)
router.post('/force-sync', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('Force sync requested by user:', userId);

    // This endpoint would trigger a sync process
    // For now, just return success - actual sync implementation would be client-side
    await SystemLogger.log('info', 'Force sync requested', {
      userId,
      req
    });

    res.json({ 
      success: true, 
      message: 'Sincronización iniciada. Los datos se actualizarán en breve.'
    });
  } catch (error) {
    console.error('Error in force sync:', error);
    await SystemLogger.logCriticalError('Force sync error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al iniciar sincronización forzada');
  }
});

export default router;
