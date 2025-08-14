import { Router } from 'express';
import { db } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';
import webPush from 'web-push';

const router = Router();

// Configure Web Push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HnYmN7J21ZiNvJGDCG6n_bHUXP5Y8v_dKfNwvRz4rHNL8HpEPYWnSAAMoI';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HERE';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'admin@outdoorteam.com';

webPush.setVapidDetails(
  `mailto:${VAPID_EMAIL}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Get user notification preferences
router.get('/preferences', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching notification preferences for user:', userId);

    const preferences = await db
      .selectFrom('user_notifications')
      .selectAll()
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (!preferences) {
      // Return default preferences if none exist
      const defaultPreferences = {
        enabled: false,
        habits: [],
        times: {},
        push_token: null,
        push_endpoint: null,
        push_keys: null
      };
      
      res.json(defaultPreferences);
      return;
    }

    const response = {
      enabled: Boolean(preferences.enabled),
      habits: JSON.parse(preferences.habits),
      times: JSON.parse(preferences.times),
      push_token: preferences.push_token,
      push_endpoint: preferences.push_endpoint
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    await SystemLogger.logCriticalError('Notification preferences fetch error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al obtener preferencias de notificaciones');
  }
});

// Update user notification preferences
router.put('/preferences', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { enabled, habits, times } = req.body;
    
    console.log('Updating notification preferences for user:', userId, { enabled, habits, times });

    // Validate habits array
    const validHabits = Array.isArray(habits) ? habits : [];
    const validTimes = typeof times === 'object' ? times : {};

    const data = {
      user_id: userId,
      enabled: enabled ? 1 : 0,
      habits: JSON.stringify(validHabits),
      times: JSON.stringify(validTimes),
      updated_at: new Date().toISOString()
    };

    // Check if preferences exist
    const existing = await db
      .selectFrom('user_notifications')
      .select(['id'])
      .where('user_id', '=', userId)
      .executeTakeFirst();

    let result;
    if (existing) {
      // Update existing preferences
      result = await db
        .updateTable('user_notifications')
        .set(data)
        .where('user_id', '=', userId)
        .returning(['enabled', 'habits', 'times'])
        .executeTakeFirst();
    } else {
      // Create new preferences
      result = await db
        .insertInto('user_notifications')
        .values({
          ...data,
          created_at: new Date().toISOString()
        })
        .returning(['enabled', 'habits', 'times'])
        .executeTakeFirst();
    }

    // Update notification jobs if enabled
    if (enabled && validHabits.length > 0) {
      await updateNotificationJobs(userId, validHabits, validTimes);
    } else {
      // Remove all notification jobs if disabled
      await db
        .deleteFrom('notification_jobs')
        .where('user_id', '=', userId)
        .execute();
    }

    const response = {
      enabled: Boolean(result?.enabled),
      habits: JSON.parse(result?.habits || '[]'),
      times: JSON.parse(result?.times || '{}')
    };

    console.log('Notification preferences updated successfully');
    res.json(response);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    await SystemLogger.logCriticalError('Notification preferences update error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al actualizar preferencias de notificaciones');
  }
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { endpoint, keys } = req.body;
    
    console.log('Subscribing user to push notifications:', userId);

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Datos de suscripción inválidos');
      return;
    }

    const subscriptionData = {
      push_endpoint: endpoint,
      push_keys: JSON.stringify(keys),
      updated_at: new Date().toISOString()
    };

    // Update or insert subscription data
    const existing = await db
      .selectFrom('user_notifications')
      .select(['id'])
      .where('user_id', '=', userId)
      .executeTakeFirst();

    if (existing) {
      await db
        .updateTable('user_notifications')
        .set(subscriptionData)
        .where('user_id', '=', userId)
        .execute();
    } else {
      await db
        .insertInto('user_notifications')
        .values({
          user_id: userId,
          enabled: 1,
          habits: '[]',
          times: '{}',
          ...subscriptionData,
          created_at: new Date().toISOString()
        })
        .execute();
    }

    console.log('Push subscription saved successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    await SystemLogger.logCriticalError('Push subscription error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al guardar suscripción push');
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('Unsubscribing user from push notifications:', userId);

    await db
      .updateTable('user_notifications')
      .set({
        enabled: 0,
        push_endpoint: null,
        push_keys: null,
        updated_at: new Date().toISOString()
      })
      .where('user_id', '=', userId)
      .execute();

    // Remove all notification jobs
    await db
      .deleteFrom('notification_jobs')
      .where('user_id', '=', userId)
      .execute();

    console.log('Push unsubscription successful');
    res.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    await SystemLogger.logCriticalError('Push unsubscription error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al cancelar suscripción push');
  }
});

// Send test notification
router.post('/test', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('Sending test notification to user:', userId);

    const user = await db
      .selectFrom('users')
      .select(['full_name'])
      .where('id', '=', userId)
      .executeTakeFirst();

    const subscription = await db
      .selectFrom('user_notifications')
      .select(['push_endpoint', 'push_keys'])
      .where('user_id', '=', userId)
      .where('enabled', '=', 1)
      .executeTakeFirst();

    if (!subscription?.push_endpoint || !subscription?.push_keys) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'No hay suscripción push activa');
      return;
    }

    const pushSubscription = {
      endpoint: subscription.push_endpoint,
      keys: JSON.parse(subscription.push_keys)
    };

    const payload = JSON.stringify({
      title: '🏆 Outdoor Team - Test',
      body: `¡Hola ${user?.full_name || 'Usuario'}! Esta es una notificación de prueba.`,
      icon: '/assets/logo-gold.png',
      badge: '/assets/logo-gold.png',
      url: '/dashboard',
      type: 'test'
    });

    await webPush.sendNotification(pushSubscription, payload);
    
    console.log('Test notification sent successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending test notification:', error);
    await SystemLogger.logCriticalError('Test notification error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al enviar notificación de prueba');
  }
});

// Send broadcast notification (admin only)
router.post('/broadcast', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { title, body, url } = req.body;
    console.log('Sending broadcast notification:', { title, body });

    if (!title || !body) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Título y mensaje son requeridos');
      return;
    }

    // Get all active push subscriptions
    const subscriptions = await db
      .selectFrom('user_notifications')
      .innerJoin('users', 'user_notifications.user_id', 'users.id')
      .select(['push_endpoint', 'push_keys', 'users.full_name'])
      .where('user_notifications.enabled', '=', 1)
      .where('users.is_active', '=', 1)
      .where('push_endpoint', 'is not', null)
      .execute();

    console.log(`Found ${subscriptions.length} active subscriptions`);

    if (subscriptions.length === 0) {
      res.json({ success: true, sent: 0, message: 'No hay usuarios suscritos' });
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/assets/logo-gold.png',
      badge: '/assets/logo-gold.png',
      url: url || '/dashboard',
      type: 'broadcast'
    });

    let sentCount = 0;
    let failedCount = 0;

    // Send notifications in batches to avoid overwhelming the server
    const batchSize = 100;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (subscription) => {
          try {
            const pushSubscription = {
              endpoint: subscription.push_endpoint!,
              keys: JSON.parse(subscription.push_keys!)
            };
            
            await webPush.sendNotification(pushSubscription, payload);
            sentCount++;
          } catch (error) {
            console.error('Error sending notification to subscription:', error);
            failedCount++;
          }
        })
      );
    }

    await SystemLogger.log('info', 'Broadcast notification sent', {
      userId: req.user.id,
      req,
      metadata: { title, body, sent: sentCount, failed: failedCount }
    });

    console.log(`Broadcast notification sent: ${sentCount} successful, ${failedCount} failed`);
    res.json({ success: true, sent: sentCount, failed: failedCount });
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    await SystemLogger.logCriticalError('Broadcast notification error', error as Error, { userId: req.user?.id, req });
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al enviar notificación masiva');
  }
});

// Mark habit as complete from notification
router.post('/mark-complete', async (req, res) => {
  try {
    const { habitKey, date, userId } = req.body;
    
    if (!habitKey || !date || !userId) {
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, 'Datos requeridos faltantes');
      return;
    }

    console.log(`Marking habit ${habitKey} complete for user ${userId} on ${date}`);

    // Update habit completion
    await db
      .insertInto('daily_habits')
      .values({
        user_id: userId,
        date,
        [habitKey]: 1,
        daily_points: 1, // This will be recalculated by the update logic
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .onConflict((oc) => oc.columns(['user_id', 'date']).doUpdateSet({
        [habitKey]: 1,
        updated_at: new Date().toISOString()
      }))
      .execute();

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking habit complete:', error);
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Error al marcar hábito como completado');
  }
});

// Helper function to update notification jobs
async function updateNotificationJobs(userId: number, habits: string[], times: Record<string, string>) {
  try {
    // Delete existing jobs for this user
    await db
      .deleteFrom('notification_jobs')
      .where('user_id', '=', userId)
      .execute();

    // Create new jobs
    const jobs = [];
    const today = new Date();
    
    for (const habitKey of habits) {
      const time = times[habitKey];
      if (time) {
        const [hour, minute] = time.split(':').map(Number);
        
        // Calculate next send time
        const nextSend = new Date(today);
        nextSend.setHours(hour, minute, 0, 0);
        
        // If time has passed today, schedule for tomorrow
        if (nextSend <= today) {
          nextSend.setDate(nextSend.getDate() + 1);
        }

        jobs.push({
          user_id: userId,
          habit_key: habitKey,
          reminder_time: time,
          next_send_at: nextSend.toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }

    if (jobs.length > 0) {
      await db
        .insertInto('notification_jobs')
        .values(jobs)
        .execute();
      
      console.log(`Created ${jobs.length} notification jobs for user ${userId}`);
    }
  } catch (error) {
    console.error('Error updating notification jobs:', error);
    throw error;
  }
}

export default router;
