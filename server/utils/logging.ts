import { Request } from 'express';
import { db } from '../database.js';

// Define the system log data interface
interface SystemLogData {
  level: 'info' | 'warn' | 'error' | 'critical';
  event: string;
  user_id?: number;
  route?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

// Simple validation function to replace Zod
function validateSystemLogData(data: any): SystemLogData {
  // Ensure required fields exist and have correct types
  if (!data.level || typeof data.level !== 'string') {
    throw new Error('Invalid level field');
  }
  
  if (!data.event || typeof data.event !== 'string') {
    throw new Error('Invalid event field');
  }

  // Validate level is one of the allowed values
  const validLevels = ['info', 'warn', 'error', 'critical'];
  if (!validLevels.includes(data.level)) {
    data.level = 'info'; // Default to info if invalid
  }

  // Clean and validate other fields
  return {
    level: data.level,
    event: String(data.event).substring(0, 200), // Limit length
    user_id: typeof data.user_id === 'number' && data.user_id > 0 ? data.user_id : undefined,
    route: typeof data.route === 'string' ? data.route.substring(0, 500) : undefined,
    ip_address: typeof data.ip_address === 'string' ? data.ip_address.substring(0, 45) : undefined,
    user_agent: typeof data.user_agent === 'string' ? data.user_agent.substring(0, 1000) : undefined,
    metadata: typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : undefined
  };
}

export class SystemLogger {
  static async log(
    level: 'info' | 'warn' | 'error' | 'critical',
    event: string,
    options?: {
      userId?: number;
      route?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
      req?: Request;
    }
  ): Promise<void> {
    try {
      // Extract request data if provided
      const logData: SystemLogData = {
        level,
        event,
        user_id: options?.userId,
        route: options?.route || options?.req?.route?.path || options?.req?.path,
        ip_address: options?.ipAddress || options?.req?.ip,
        user_agent: options?.userAgent || options?.req?.get('User-Agent'),
        metadata: options?.metadata
      };

      // Validate log data with simple validation
      const validated = validateSystemLogData(logData);

      // Insert into database
      await db
        .insertInto('system_logs')
        .values({
          level: validated.level,
          event: validated.event,
          user_id: validated.user_id || null,
          route: validated.route || null,
          ip_address: validated.ip_address || null,
          user_agent: validated.user_agent || null,
          metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
          created_at: new Date().toISOString()
        })
        .execute();

      // Also log to console for development
      const logLevel = level === 'critical' ? 'error' : level;
      console[logLevel](`[${level.toUpperCase()}] ${event}`, {
        userId: options?.userId,
        route: validated.route,
        metadata: options?.metadata
      });

    } catch (error) {
      // Don't throw errors from logging - just console log
      console.error('Failed to write system log:', error);
      console[level === 'critical' ? 'error' : level](`[${level.toUpperCase()}] ${event}`);
    }
  }

  static async logValidationError(
    event: string,
    fieldErrors: Record<string, string>,
    options?: {
      userId?: number;
      req?: Request;
    }
  ): Promise<void> {
    await this.log('warn', `Validation Error: ${event}`, {
      userId: options?.userId,
      req: options?.req,
      metadata: {
        validation_errors: fieldErrors,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async logAuthError(
    event: string,
    email?: string,
    req?: Request
  ): Promise<void> {
    await this.log('warn', `Auth Error: ${event}`, {
      req,
      metadata: {
        email: email ? email.substring(0, 3) + '***' : undefined, // Partially mask email
        timestamp: new Date().toISOString()
      }
    });
  }

  static async logFileUploadError(
    event: string,
    filename: string,
    error: string,
    options?: {
      userId?: number;
      req?: Request;
    }
  ): Promise<void> {
    await this.log('error', `File Upload Error: ${event}`, {
      userId: options?.userId,
      req: options?.req,
      metadata: {
        filename,
        error,
        timestamp: new Date().toISOString()
      }
    });
  }

  static async logCriticalError(
    event: string,
    error: Error,
    options?: {
      userId?: number;
      req?: Request;
    }
  ): Promise<void> {
    await this.log('critical', `Critical Error: ${event}`, {
      userId: options?.userId,
      req: options?.req,
      metadata: {
        error_message: error.message,
        error_stack: error.stack?.substring(0, 1000), // Limit stack trace length
        timestamp: new Date().toISOString()
      }
    });
  }

  static async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const result = await db
        .deleteFrom('system_logs')
        .where('created_at', '<', cutoffDate.toISOString())
        .execute();

      console.log(`Cleaned up ${result.length} old log entries older than ${retentionDays} days`);
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  static async getRecentLogs(
    limit: number = 100,
    level?: 'info' | 'warn' | 'error' | 'critical'
  ): Promise<any[]> {
    try {
      let query = db
        .selectFrom('system_logs')
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit);

      if (level) {
        query = query.where('level', '=', level);
      }

      return await query.execute();
    } catch (error) {
      console.error('Failed to fetch recent logs:', error);
      return [];
    }
  }

  static async getLogStats(): Promise<Record<string, number>> {
    try {
      const stats = await db
        .selectFrom('system_logs')
        .select(['level', db.fn.count<number>('id').as('count')])
        .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .groupBy('level')
        .execute();

      return stats.reduce((acc, stat) => {
        acc[stat.level] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.error('Failed to get log stats:', error);
      return {};
    }
  }
}
