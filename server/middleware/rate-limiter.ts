import { Request, Response, NextFunction } from 'express';
import { SystemLogger } from '../utils/logging.js';
import { ERROR_CODES, createErrorResponse } from '../utils/validation.js';

const parseBooleanFlag = (value?: string | null): boolean =>
  value === 'true' || value === '1';

export const isRateLimitDisabled = (): boolean =>
  parseBooleanFlag(process.env.DISABLE_RATE_LIMIT) ||
  parseBooleanFlag(process.env.DISABLE_RATE_LIMITING);

interface RateLimitStore {
  get(key: string): Promise<number | null>;
  getInfo(key: string): Promise<{ count: number; resetTime: number } | null>;
  increment(key: string, windowMs: number): Promise<number>;
  setWithExpiry(key: string, windowMs: number): Promise<void>;
  reset(key: string): Promise<void>;
}

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

  async getInfo(key: string): Promise<{ count: number; resetTime: number } | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return { count: item.count, resetTime: item.resetTime };
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

  async setWithExpiry(key: string, windowMs: number): Promise<void> {
    const now = Date.now();
    this.store.set(key, { count: 1, resetTime: now + windowMs });
  }
  
  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.resetTime) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
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
  mode?: 'increment' | 'check';
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
    
    if (this.store instanceof MemoryStore) {
      setInterval(() => {
        (this.store as MemoryStore).cleanup();
      }, 5 * 60 * 1000);
    }
  }
  
  createMiddleware(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip rate limiting only when explicitly disabled or whitelisted
        if (isRateLimitDisabled() || this.shouldSkipRateLimit(req)) {
          return next();
        }
        
        const keys = this.generateKeys(req, config);
        const results: RateLimitInfo[] = [];
        let isLimited = false;
        
        for (const key of keys) {
          let rateLimitInfo: RateLimitInfo;

          if (config.mode === 'check') {
            const info = await this.store.getInfo(key);
            if (info) {
              rateLimitInfo = {
                limit: config.maxRequests,
                current: info.count,
                remaining: Math.max(0, config.maxRequests - info.count),
                resetTime: info.resetTime
              };
              
              if (info.count > config.maxRequests) {
                isLimited = true;
                if (config.onLimitReached) {
                  config.onLimitReached(req, rateLimitInfo);
                }
              }
            } else {
              rateLimitInfo = {
                limit: config.maxRequests,
                current: 0,
                remaining: config.maxRequests,
                resetTime: Date.now() + config.windowMs
              };
            }
          } else {
            const current = await this.store.increment(key, config.windowMs);
            const resetTime = Date.now() + config.windowMs;
            
            rateLimitInfo = {
              limit: config.maxRequests,
              current,
              remaining: Math.max(0, config.maxRequests - current),
              resetTime
            };
            
            if (current > config.maxRequests) {
              isLimited = true;
              await this.logRateLimitViolation(req, key, rateLimitInfo);
              if (config.onLimitReached) {
                config.onLimitReached(req, rateLimitInfo);
              }
            }
          }

          results.push(rateLimitInfo);
        }
        
        const mostRestrictive = results.reduce((prev, current) => 
          current.remaining < prev.remaining ? current : prev
        );
        
        this.setRateLimitHeaders(res, mostRestrictive);
        
        if (isLimited) {
          const retryAfter = Math.ceil((mostRestrictive.resetTime - Date.now()) / 1000);
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
        next();
      }
    };
  }
  
  private generateKeys(req: Request, config: RateLimitConfig): string[] {
    if (config.keyGenerator) {
      const keys = config.keyGenerator(req);
      return Array.isArray(keys) ? keys : [keys];
    }
    
    const clientIP = this.getClientIP(req);
    return [`ip:${clientIP}`];
  }
  
  private getClientIP(req: Request): string {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
  
  private shouldSkipRateLimit(req: Request): boolean {
    const path = req.path;
    
    // Skip many more paths for builds
    if (path === '/health' || 
        path === '/api/health' ||
        path.startsWith('/cron/') || 
        path.startsWith('/api/cron/') ||
        path.startsWith('/webhook/') || 
        path.startsWith('/api/webhook/') ||
        path.startsWith('/static/') ||
        path.includes('.js') ||
        path.includes('.css') ||
        path.includes('.png') ||
        path.includes('.jpg') ||
        path.includes('.ico') ||
        path.includes('.map')) {
      return true;
    }
    
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
      return true;
    }
    
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
      const user = (req as any).user;
      const userId = user?.id;
      
      await SystemLogger.log('warn', 'RATE_LIMITED', {
        userId,
        metadata: {
          rate_limit_key: key,
          limit: rateLimitInfo.limit,
          current: rateLimitInfo.current,
          ip_address: this.getClientIP(req),
          user_agent: req.get('User-Agent') || undefined,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
  }

  public resetAll(): void {
    if (this.store instanceof MemoryStore) {
      (this.store as MemoryStore).clear();
    }
  }

  public async resetLoginBlocks(email: string, ip: string): Promise<void> {
    await this.store.reset(`login:block:ip:${ip}`);
    await this.store.reset(`login:block:email:${email.toLowerCase()}`);
  }
}

export const rateLimiter = new RateLimiter();

export const globalApiLimit = rateLimiter.createMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 100,
  customMessage: 'Too many API requests. Please slow down.'
});

export const burstLimit = rateLimiter.createMiddleware({
  windowMs: 1000,
  maxRequests: 20,
  customMessage: 'Too many requests in a short time. Please wait a moment.'
});

export const loginLimit = rateLimiter.createMiddleware({
  windowMs: 15 * 60 * 1000,
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
  onLimitReached: async (req) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const email = req.body?.email?.toLowerCase() || 'no-email';
    const extendedBlockMs = 15 * 60 * 1000;
    await rateLimiter['store'].setWithExpiry(`login:block:ip:${clientIP}`, extendedBlockMs);
    await rateLimiter['store'].setWithExpiry(`login:block:email:${email}`, extendedBlockMs);
  }
});

export const registerLimit = rateLimiter.createMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 3,
  customMessage: 'Too many registration attempts. Please try again later.'
});

export const passwordResetLimit = rateLimiter.createMiddleware({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  customMessage: 'Too many password reset requests. Please try again in an hour.'
});

export const checkLoginBlock = rateLimiter.createMiddleware({
  mode: 'check',
  windowMs: 15 * 60 * 1000,
  maxRequests: 0,
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
