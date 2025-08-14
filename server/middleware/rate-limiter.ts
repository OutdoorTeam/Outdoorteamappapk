import { Request, Response, NextFunction } from 'express';
import { SystemLogger } from '../utils/logging.js';
import { ERROR_CODES, createErrorResponse } from '../utils/validation.js';

interface RateLimitStore {
  get(key: string): Promise<number | null>;
  increment(key: string, windowMs: number): Promise<number>;
  reset(key: string): Promise<void>;
}

// In-memory rate limit store (can be replaced with Redis later)
class MemoryStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  
  async get(key: string): Promise<number | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return item.count;
  }
  
  async increment(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const item = this.store.get(key);
    
    if (!item || now > item.resetTime) {
      const newItem = { count: 1, resetTime: now + windowMs };
      this.store.set(key, newItem);
      return 1;
    }
    
    item.count++;
    this.store.set(key, item);
    return item.count;
  }
  
  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string | string[];
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, rateLimitInfo: RateLimitInfo) => void;
  customMessage?: string;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
}

class RateLimiter {
  private store: RateLimitStore;
  
  constructor(store?: RateLimitStore) {
    this.store = store || new MemoryStore();
    
    // Cleanup expired entries every 5 minutes
    if (this.store instanceof MemoryStore) {
      setInterval(() => {
        (this.store as MemoryStore).cleanup();
      }, 5 * 60 * 1000);
    }
  }
  
  createMiddleware(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip internal routes
        if (this.shouldSkipRateLimit(req)) {
          return next();
        }
        
        const keys = this.generateKeys(req, config);
        const results: RateLimitInfo[] = [];
        let isLimited = false;
        
        // Check all keys (IP, user, etc.)
        for (const key of keys) {
          const current = await this.store.increment(key, config.windowMs);
          const resetTime = Date.now() + config.windowMs;
          
          const rateLimitInfo: RateLimitInfo = {
            limit: config.maxRequests,
            current,
            remaining: Math.max(0, config.maxRequests - current),
            resetTime
          };
          
          results.push(rateLimitInfo);
          
          if (current > config.maxRequests) {
            isLimited = true;
            
            // Log the rate limit violation
            await this.logRateLimitViolation(req, key, rateLimitInfo);
            
            if (config.onLimitReached) {
              config.onLimitReached(req, rateLimitInfo);
            }
          }
        }
        
        // Set rate limit headers based on the most restrictive limit
        const mostRestrictive = results.reduce((prev, current) => 
          current.remaining < prev.remaining ? current : prev
        );
        
        this.setRateLimitHeaders(res, mostRestrictive);
        
        if (isLimited) {
          const retryAfter = Math.ceil(config.windowMs / 1000);
          res.set('Retry-After', retryAfter.toString());
          
          const errorResponse = createErrorResponse(
            ERROR_CODES.RATE_LIMIT_ERROR,
            config.customMessage || 'Too many requests. Please try again later.'
          );
          
          res.status(429).json(errorResponse);
          return;
        }
        
        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Don't block requests if rate limiter fails
        next();
      }
    };
  }
  
  private generateKeys(req: Request, config: RateLimitConfig): string[] {
    if (config.keyGenerator) {
      const keys = config.keyGenerator(req);
      return Array.isArray(keys) ? keys : [keys];
    }
    
    // Default to IP-based limiting
    const clientIP = this.getClientIP(req);
    return [`ip:${clientIP}`];
  }
  
  private getClientIP(req: Request): string {
    // Trust proxy headers (X-Forwarded-For, etc.)
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
  
  private shouldSkipRateLimit(req: Request): boolean {
    const path = req.path;
    
    // Skip health checks
    if (path === '/health' || path === '/api/health') {
      return true;
    }
    
    // Skip cron jobs
    if (path.startsWith('/cron/') || path.startsWith('/api/cron/')) {
      return true;
    }
    
    // Skip webhooks (can add specific webhook paths here)
    if (path.startsWith('/webhook/') || path.startsWith('/api/webhook/')) {
      return true;
    }
    
    // Skip if internal API key is provided
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
      return true;
    }
    
    // Skip if request is from allowed internal IPs
    const allowedIPs = process.env.INTERNAL_IPS?.split(',') || ['127.0.0.1', '::1'];
    const clientIP = this.getClientIP(req);
    if (allowedIPs.includes(clientIP)) {
      return true;
    }
    
    return false;
  }
  
  private setRateLimitHeaders(res: Response, rateLimitInfo: RateLimitInfo): void {
    res.set({
      'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString(),
    });
  }
  
  private async logRateLimitViolation(
    req: Request, 
    key: string, 
    rateLimitInfo: RateLimitInfo
  ): Promise<void> {
    try {
      // Extract user ID if available
      const user = (req as any).user;
      const userId = user?.id;
      
      await SystemLogger.log('warn', 'RATE_LIMITED', {
        userId,
        req,
        metadata: {
          rate_limit_key: key,
          limit: rateLimitInfo.limit,
          current: rateLimitInfo.current,
          ip_address: this.getClientIP(req),
          user_agent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
  }
}

// Create singleton instance
export const rateLimiter = new RateLimiter();

// Pre-configured middleware functions
export const globalApiLimit = rateLimiter.createMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  customMessage: 'Too many API requests. Please slow down.'
});

export const burstLimit = rateLimiter.createMiddleware({
  windowMs: 1000, // 1 second
  maxRequests: 10,
  customMessage: 'Too many requests in a short time. Please wait a moment.'
});

export const loginLimit = rateLimiter.createMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  keyGenerator: (req) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const email = req.body?.email?.toLowerCase() || 'no-email';
    return [
      `login:ip:${clientIP}`,
      `login:email:${email}`
    ];
  },
  customMessage: 'Too many login attempts. Please try again in 15 minutes.',
  onLimitReached: async (req, rateLimitInfo) => {
    // Additional blocking for 15 minutes after hitting limit
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const email = req.body?.email?.toLowerCase() || 'no-email';
    
    // Set extended block
    const extendedBlockMs = 15 * 60 * 1000; // 15 minutes
    await rateLimiter['store'].increment(`login:block:ip:${clientIP}`, extendedBlockMs);
    await rateLimiter['store'].increment(`login:block:email:${email}`, extendedBlockMs);
  }
});

export const registerLimit = rateLimiter.createMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3,
  customMessage: 'Too many registration attempts. Please try again later.'
});

export const passwordResetLimit = rateLimiter.createMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  customMessage: 'Too many password reset requests. Please try again in an hour.'
});

// Extended login block check middleware
export const checkLoginBlock = rateLimiter.createMiddleware({
  windowMs: 1, // Just check, don't increment
  maxRequests: 0, // Always block if key exists
  keyGenerator: (req) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const email = req.body?.email?.toLowerCase() || 'no-email';
    return [
      `login:block:ip:${clientIP}`,
      `login:block:email:${email}`
    ];
  },
  customMessage: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.'
});
