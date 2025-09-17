import webpush from 'web-push';
import { SystemLogger } from '../utils/logging.js';
import { getVapidConfig } from '../config/security.js';

class NotificationScheduler {
  private isRunning = false;
  private cronJob: any = null;
  private isConfigured = false;

  constructor() {
    this.checkVapidConfiguration();
    if (this.isConfigured) {
      console.log('✅ NotificationScheduler initialized and configured');
    } else {
      console.log('⚠️  NotificationScheduler initialized but VAPID keys not configured');
    }
  }

  private checkVapidConfiguration(): void {
    const vapid = getVapidConfig();

    this.isConfigured = !!vapid;

    if (this.isConfigured && vapid) {
      try {
        webpush.setVapidDetails(
          `mailto:${vapid.email}`,
          vapid.publicKey,
          vapid.privateKey
        );
        console.log('✅ VAPID keys configured successfully for push notifications');
        console.log(`📧 VAPID email: ${vapid.email}`);
        console.log(`🔑 VAPID public key: ${vapid.publicKey.substring(0, 20)}...`);
      } catch (error) {
        console.error('❌ Error configuring VAPID keys:', error);
        this.isConfigured = false;
      }
    } else {
      console.log('');
      console.log('═══════════════════════════════════════');
      console.log('⚠️   VAPID KEYS NOT CONFIGURED   ⚠️');
      console.log('═══════════════════════════════════════');
      console.log('Push notifications are disabled.');
      console.log('');
      console.log('To enable push notifications:');
      console.log('1. Run: npm run generate-vapid');
      console.log('2. Restart the server');
      console.log('');
      console.log('Current VAPID status:');
      console.log(`- Public key: ${vapid?.publicKey ? '✓ Set' : '✗ Missing'}`);
      console.log(`- Private key: ${vapid?.privateKey ? '✓ Set' : '✗ Missing'}`);
      console.log(`- Email: ${vapid?.email || '✗ Missing'}`);
      console.log('═══════════════════════════════════════');
      console.log('');

      void SystemLogger.log('warn', 'Push notifications disabled: invalid VAPID configuration', {
        metadata: {
          hasPublicKey: Boolean(vapid?.publicKey),
          hasPrivateKey: Boolean(vapid?.privateKey)
        }
      });
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
    const vapid = getVapidConfig();

    return {
      configured: !!vapid,
      publicKey: vapid?.publicKey,
      email: vapid?.email || 'admin@moutdoorteam.com'
    };
  }
}

export default NotificationScheduler;
