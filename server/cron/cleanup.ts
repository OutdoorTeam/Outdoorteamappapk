// CRON job for cleaning up old system logs
// This file would be called by a scheduler or external cron service
import { SystemLogger } from '../utils/logging.js';

async function cleanupSystemLogs() {
  try {
    console.log('Starting system logs cleanup...');
    
    // Clean up logs older than 90 days
    await SystemLogger.cleanupOldLogs(90);
    
    await SystemLogger.log('info', 'System logs cleanup completed', {
      metadata: { retention_days: 90 }
    });
    
    console.log('System logs cleanup completed successfully');
  } catch (error) {
    console.error('Failed to cleanup system logs:', error);
    await SystemLogger.logCriticalError('System logs cleanup failed', error as Error);
  }
}

// Run cleanup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupSystemLogs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { cleanupSystemLogs };
