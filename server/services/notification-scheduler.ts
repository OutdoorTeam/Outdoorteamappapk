import webpush from 'web-push';
import { SystemLogger } from '../utils/logging.js';
import { db } from '../database.js';

class NotificationScheduler {
  private database: any;
  private isRunning = false;
  private cronJob: any = null;
  private isConfigured = false;

  constructor(database: any) {
    this.database = database;
    this.checkVapidConfiguration();
    console.log(`NotificationScheduler initialized (${this.isConfigured ? 'enabled' : 'disabled'} mode)`);
  }

  public async initialize(): Promise<void> {
    console.log('🔔 Initializing NotificationScheduler...');
    
    try {
      this.checkVapidConfiguration();
      
      if (this.isConfigured) {
        console.log('✅ NotificationScheduler initialized successfully');
      } else {
        console.log('⚠️  NotificationScheduler initialized in disabled mode (VAPID not configured)');
      }
    } catch (error) {
      console.error('❌ Error initializing NotificationScheduler:', error);
      await SystemLogger.logCriticalError('NotificationScheduler initialization failed', error as Error);
      throw error;
    }
  }

  private checkVapidConfiguration(): void {
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
    const VAPID_EMAIL = process.env.VAPID_EMAIL || 'admin@outdoorteam.com';

    this.isConfigured = !!(
      VAPID_PUBLIC_KEY && 
      VAPID_PRIVATE_KEY && 
      VAPID_PRIVATE_KEY !== 'YOUR_PRIVATE_KEY_HERE' && 
      VAPID_PRIVATE_KEY.length >= 32
    );

    if (this.isConfigured) {
      try {
        webpush.setVapidDetails(
          `mailto:${VAPID_EMAIL}`,
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY
        );
        console.log('✅ VAPID keys configured successfully for push notifications');
      } catch (error) {
        console.error('❌ Error configuring VAPID keys:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️  VAPID keys are not configured!');
      console.warn('   Push notifications will not work.');
      console.warn('   To fix this:');
      console.warn('   1. Run: npm run generate-vapid');
      console.warn('   2. Restart the server');
    }
  }

  public async processNotifications(): Promise<void> {
    if (!this.isConfigured) {
      return; // Skip if not configured
    }
    
    // Implementation would go here when needed
    return;
  }

  public async sendProgressAlert(userId: number, type: string, data: any): Promise<void> {
    if (!this.isConfigured) {
      console.log(`Progress alert disabled (VAPID not configured) for user ${userId}:`, type);
      return;
    }

    console.log(`Progress alert for user ${userId}:`, type);
    return;
  }

  public async sendAdminBroadcast(title: string, body: string, url?: string): Promise<{ sent: number; failed: number }> {
    if (!this.isConfigured) {
      console.log('Admin broadcast disabled (VAPID not configured):', { title, body });
      return { sent: 0, failed: 0 };
    }

    console.log('Admin broadcast:', { title, body });
    return { sent: 0, failed: 0 };
  }

  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log(`NotificationScheduler stopped (was ${this.isConfigured ? 'enabled' : 'disabled'})`);
  }

  public start(): void {
    this.isRunning = true;
    console.log(`NotificationScheduler started (${this.isConfigured ? 'enabled' : 'disabled'} mode)`);
  }

  public isVapidConfigured(): boolean {
    return this.isConfigured;
  }

  public getStatus(): { isRunning: boolean; isConfigured: boolean } {
    return {
      isRunning: this.isRunning,
      isConfigured: this.isConfigured
    };
  }
}

export default NotificationScheduler;
