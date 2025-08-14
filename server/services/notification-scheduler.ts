import cron from 'node-cron';
import { db } from '../database.js';
import { SystemLogger } from '../utils/logging.js';
import webPush from 'web-push';

class NotificationScheduler {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.initializeScheduler();
  }

  private initializeScheduler() {
    // Run every minute to check for due notifications
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.processNotifications();
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    });

    console.log('Notification scheduler initialized - checking every minute');
  }

  public async processNotifications(): Promise<void> {
    if (this.isRunning) {
      console.log('Notification processing already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      const now = new Date();
      const currentTime = now.toISOString();
      
      console.log(`Processing notifications at ${currentTime}`);

      // Get all due notification jobs
      const dueJobs = await db
        .selectFrom('notification_jobs')
        .innerJoin('user_notifications', 'notification_jobs.user_id', 'user_notifications.user_id')
        .innerJoin('users', 'notification_jobs.user_id', 'users.id')
        .select([
          'notification_jobs.id as job_id',
          'notification_jobs.user_id',
          'notification_jobs.habit_key',
          'notification_jobs.reminder_time',
          'notification_jobs.next_send_at',
          'user_notifications.push_endpoint',
          'user_notifications.push_keys',
          'users.full_name',
          'users.is_active'
        ])
        .where('notification_jobs.next_send_at', '<=', currentTime)
        .where('user_notifications.enabled', '=', 1)
        .where('users.is_active', '=', 1)
        .where('user_notifications.push_endpoint', 'is not', null)
        .execute();

      console.log(`Found ${dueJobs.length} due notifications`);

      if (dueJobs.length === 0) {
        return;
      }

      // Process each notification
      const results = await Promise.allSettled(
        dueJobs.map(job => this.sendHabitReminder(job))
      );

      // Update next send times and log results
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const job = dueJobs[i];

        if (result.status === 'fulfilled') {
          sentCount++;
          // Update next send time (add 24 hours)
          const nextSend = new Date(job.next_send_at);
          nextSend.setDate(nextSend.getDate() + 1);

          await db
            .updateTable('notification_jobs')
            .set({ next_send_at: nextSend.toISOString() })
            .where('id', '=', job.job_id)
            .execute();
        } else {
          failedCount++;
          console.error(`Failed to send notification to user ${job.user_id}:`, result.reason);
        }
      }

      await SystemLogger.log('info', 'Notification batch processed', {
        metadata: { 
          processed: dueJobs.length, 
          sent: sentCount, 
          failed: failedCount,
          timestamp: currentTime
        }
      });

      console.log(`Notification processing complete: ${sentCount} sent, ${failedCount} failed`);
    } catch (error) {
      console.error('Error processing notifications:', error);
      await SystemLogger.logCriticalError('Notification processing error', error as Error);
    } finally {
      this.isRunning = false;
    }
  }

  private async sendHabitReminder(job: any): Promise<void> {
    try {
      // Check if habit is already completed today
      const today = new Date().toISOString().split('T')[0];
      const habitStatus = await db
        .selectFrom('daily_habits')
        .select([job.habit_key])
        .where('user_id', '=', job.user_id)
        .where('date', '=', today)
        .executeTakeFirst();

      // Skip if habit is already completed
      if (habitStatus && habitStatus[job.habit_key as keyof typeof habitStatus]) {
        console.log(`Skipping notification for user ${job.user_id} - habit ${job.habit_key} already completed`);
        return;
      }

      const pushSubscription = {
        endpoint: job.push_endpoint,
        keys: JSON.parse(job.push_keys)
      };

      const habitNames: Record<string, string> = {
        training_completed: 'Entrenamiento',
        nutrition_completed: 'Nutrición', 
        movement_completed: 'Pasos Diarios',
        meditation_completed: 'Meditación'
      };

      const habitIcons: Record<string, string> = {
        training_completed: '💪',
        nutrition_completed: '🥗',
        movement_completed: '👟',
        meditation_completed: '🧘'
      };

      const habitName = habitNames[job.habit_key] || job.habit_key;
      const habitIcon = habitIcons[job.habit_key] || '⏰';

      const payload = JSON.stringify({
        title: `${habitIcon} Recordatorio: ${habitName}`,
        body: `¡Hola ${job.full_name}! Es hora de completar tu ${habitName.toLowerCase()}`,
        icon: '/assets/logo-gold.png',
        badge: '/assets/logo-gold.png',
        url: '/dashboard',
        habitKey: job.habit_key,
        userId: job.user_id,
        type: 'habit_reminder',
        timestamp: new Date().getTime()
      });

      await webPush.sendNotification(pushSubscription, payload);
      console.log(`Habit reminder sent to user ${job.user_id} for ${habitName}`);
    } catch (error) {
      console.error(`Error sending habit reminder to user ${job.user_id}:`, error);
      throw error;
    }
  }

  public async sendProgressAlert(userId: number, type: 'weekly_goal_close' | 'weekly_goal_achieved', data: any): Promise<void> {
    try {
      console.log(`Sending progress alert to user ${userId}:`, type);

      const userNotification = await db
        .selectFrom('user_notifications')
        .innerJoin('users', 'user_notifications.user_id', 'users.id')
        .select([
          'user_notifications.push_endpoint',
          'user_notifications.push_keys', 
          'users.full_name'
        ])
        .where('user_notifications.user_id', '=', userId)
        .where('user_notifications.enabled', '=', 1)
        .where('user_notifications.push_endpoint', 'is not', null)
        .executeTakeFirst();

      if (!userNotification?.push_endpoint) {
        console.log(`No push subscription found for user ${userId}`);
        return;
      }

      const pushSubscription = {
        endpoint: userNotification.push_endpoint,
        keys: JSON.parse(userNotification.push_keys!)
      };

      let title = '';
      let body = '';

      if (type === 'weekly_goal_close') {
        title = '🎯 ¡Casi lo logras!';
        body = `¡Hola ${userNotification.full_name}! Te faltan solo ${data.pointsNeeded} puntos para completar tu meta semanal.`;
      } else if (type === 'weekly_goal_achieved') {
        title = '🏆 ¡Meta Alcanzada!';
        body = `¡Felicidades ${userNotification.full_name}! Has completado tu meta semanal con ${data.totalPoints} puntos.`;
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: '/assets/logo-gold.png',
        badge: '/assets/logo-gold.png',
        url: '/dashboard',
        type,
        userId,
        data
      });

      await webPush.sendNotification(pushSubscription, payload);
      console.log(`Progress alert sent to user ${userId}`);
    } catch (error) {
      console.error(`Error sending progress alert to user ${userId}:`, error);
      throw error;
    }
  }

  public async sendAdminBroadcast(title: string, body: string, url?: string): Promise<{ sent: number; failed: number }> {
    try {
      console.log('Sending admin broadcast:', { title, body });

      const subscriptions = await db
        .selectFrom('user_notifications')
        .innerJoin('users', 'user_notifications.user_id', 'users.id')
        .select(['push_endpoint', 'push_keys', 'users.full_name'])
        .where('user_notifications.enabled', '=', 1)
        .where('users.is_active', '=', 1)
        .where('push_endpoint', 'is not', null)
        .execute();

      if (subscriptions.length === 0) {
        return { sent: 0, failed: 0 };
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: '/assets/logo-gold.png',
        badge: '/assets/logo-gold.png',
        url: url || '/dashboard',
        type: 'admin_broadcast'
      });

      let sentCount = 0;
      let failedCount = 0;

      // Send in batches to avoid overwhelming the server
      const batchSize = 100;
      for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async (subscription) => {
            const pushSubscription = {
              endpoint: subscription.push_endpoint!,
              keys: JSON.parse(subscription.push_keys!)
            };
            
            await webPush.sendNotification(pushSubscription, payload);
          })
        );

        results.forEach(result => {
          if (result.status === 'fulfilled') {
            sentCount++;
          } else {
            failedCount++;
          }
        });
      }

      await SystemLogger.log('info', 'Admin broadcast sent', {
        metadata: { title, body, sent: sentCount, failed: failedCount }
      });

      return { sent: sentCount, failed: failedCount };
    } catch (error) {
      console.error('Error sending admin broadcast:', error);
      throw error;
    }
  }

  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('Notification scheduler stopped');
    }
  }

  public start(): void {
    if (this.cronJob) {
      this.cronJob.start();
      console.log('Notification scheduler started');
    }
  }
}

export default NotificationScheduler;
