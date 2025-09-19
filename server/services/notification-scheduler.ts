﻿import webpush from 'web-push';
import { SystemLogger } from '../utils/logging.js';

class NotificationScheduler {
  private isRunning = false;
  private cronJob: any = null;
  private isConfigured = false;

  constructor() {
    this.checkVapidConfiguration();
    if (this.isConfigured) {
      console.log('âœ… NotificationScheduler initialized and configured');
    } else {
      console.log('âš ï¸  NotificationScheduler initialized but VAPID keys not configured');
    }
  }

  private checkVapidConfiguration(): void {
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
    const VAPID_EMAIL = process.env.VAPID_EMAIL || 'admin@moutdoorteam.com';

    // Check if keys are properly configured
    this.isConfigured = !!(
      VAPID_PUBLIC_KEY && 
      VAPID_PRIVATE_KEY && 
      VAPID_PRIVATE_KEY !== 'YOUR_PRIVATE_KEY_HERE' && 
      VAPID_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY_HERE' &&
      VAPID_PRIVATE_KEY.length >= 32 &&
      VAPID_PUBLIC_KEY.length >= 32
    );

    if (this.isConfigured) {
      const publicKey = VAPID_PUBLIC_KEY!;
      const privateKey = VAPID_PRIVATE_KEY!;
      try {
        webpush.setVapidDetails(
          `mailto:${VAPID_EMAIL}`,
          publicKey,
          privateKey
        );
        console.log('âœ… VAPID keys configured successfully for push notifications');
        console.log(`ðŸ“§ VAPID email: ${VAPID_EMAIL}`);
        console.log(`ðŸ”‘ VAPID public key: ${publicKey.substring(0, 20)}...`);
      } catch (error) {
        console.error('âŒ Error configuring VAPID keys:', error);
        this.isConfigured = false;
      }
    } else {
      console.log('');
      console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
      console.log('âš ï¸   VAPID KEYS NOT CONFIGURED   âš ï¸');
      console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
      console.log('Push notifications are disabled.');
      console.log('');
      console.log('To enable push notifications:');
      console.log('1. Run: npm run generate-vapid');
      console.log('2. Restart the server');
      console.log('');
      console.log('Current VAPID status:');
      console.log(`- Public key: ${VAPID_PUBLIC_KEY ? 'âœ“ Set' : 'âœ— Missing'}`);
      console.log(`- Private key: ${VAPID_PRIVATE_KEY ? 'âœ“ Set' : 'âœ— Missing'}`);
      console.log(`- Email: ${VAPID_EMAIL || 'âœ— Missing'}`);
      console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
      console.log('');
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
    console.log(`NotificationScheduler stopped (was ${this.isConfigured ? 'enabled' : 'disabled'})`);
  }

  public start(): void {
    console.log(`NotificationScheduler started (${this.isConfigured ? 'enabled' : 'disabled'} mode)`);
  }

  public isVapidConfigured(): boolean {
    return this.isConfigured;
  }

  public getVapidStatus(): { configured: boolean; publicKey?: string; email?: string } {
    return {
      configured: this.isConfigured,
      publicKey: this.isConfigured ? process.env.VAPID_PUBLIC_KEY : undefined,
      email: process.env.VAPID_EMAIL || 'admin@moutdoorteam.com'
    };
  }
}

export default NotificationScheduler;


