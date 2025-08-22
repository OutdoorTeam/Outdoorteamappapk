import { SystemLogger } from '../utils/logging.js';

// Disabled NotificationScheduler - no push notifications
class NotificationScheduler {
  private isRunning = false;
  private cronJob: any = null;

  constructor() {
    console.log('NotificationScheduler initialized (disabled mode)');
  }

  public async processNotifications(): Promise<void> {
    // No-op - notifications are disabled
    return;
  }

  public async sendProgressAlert(userId: number, type: string, data: any): Promise<void> {
    // No-op - notifications are disabled
    console.log(`Progress alert disabled for user ${userId}:`, type);
    return;
  }

  public async sendAdminBroadcast(title: string, body: string, url?: string): Promise<{ sent: number; failed: number }> {
    // No-op - notifications are disabled
    console.log('Admin broadcast disabled:', { title, body });
    return { sent: 0, failed: 0 };
  }

  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    console.log('NotificationScheduler stopped (was disabled)');
  }

  public start(): void {
    console.log('NotificationScheduler start (disabled mode)');
  }
}

export default NotificationScheduler;
