import { Request, Response, NextFunction } from 'express';
import { ERROR_CODES, sendErrorResponse } from '../utils/validation.js';

// IP allowlist middleware for internal routes
export function ipAllowlist(allowedIPs: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Default allowed IPs if none provided
    const defaultAllowed = ['127.0.0.1', '::1', 'localhost'];
    const allowed = allowedIPs.length > 0 ? allowedIPs : defaultAllowed;
    
    if (allowed.includes(clientIP)) {
      next();
    } else {
      console.warn(`Blocked request from unauthorized IP: ${clientIP}`);
      sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Access denied');
    }
  };
}

// API key authentication for internal services
export function requireInternalApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-internal-api-key'] as string;
  const expectedApiKey = process.env.INTERNAL_API_KEY;
  
  if (!expectedApiKey) {
    console.warn('INTERNAL_API_KEY not configured');
    sendErrorResponse(res, ERROR_CODES.SERVER_ERROR, 'Internal API key not configured');
    return;
  }
  
  if (!apiKey || apiKey !== expectedApiKey) {
    console.warn('Invalid or missing internal API key');
    sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Invalid or missing API key');
    return;
  }
  
  next();
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

// Request size limiter
export function requestSizeLimiter(maxSizeBytes: number = 10 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
      sendErrorResponse(res, ERROR_CODES.VALIDATION_ERROR, `Request too large. Maximum size: ${maxSizeMB}MB`);
      return;
    }
    
    next();
  };
}
