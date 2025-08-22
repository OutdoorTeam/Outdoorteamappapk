import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { ERROR_CODES, sendErrorResponse } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

// Define allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const origins = [];
  
  // Production domain
  origins.push('https://app.mioutdoorteam.com');
  
  // Development origins (only in non-production environments)
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173');
    origins.push('http://127.0.0.1:5173');
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
  }
  
  return origins;
};

// Custom origin validation function
const validateOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Allow requests with no origin (e.g., mobile apps, server-to-server)
  if (!origin) {
    callback(null, true);
    return;
  }
  
  // Check if origin is in allowlist
  if (allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  
  // Log blocked origin attempt
  console.warn(`CORS: Blocked origin attempt: ${origin}`);
  SystemLogger.log('warn', 'CORS origin blocked', {
    metadata: {
      blocked_origin: origin,
      allowed_origins: allowedOrigins,
      timestamp: new Date().toISOString()
    }
  });
  
  callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
};

// CORS configuration
export const corsOptions: CorsOptions = {
  origin: validateOrigin,
  credentials: true, // Allow credentials (Authorization header, cookies)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'Accept',
    'X-Requested-With',
    'Origin',
    'X-Internal-API-Key'
  ],
  exposedHeaders: [
    'Content-Disposition', // For file downloads
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 600, // Cache preflight for 10 minutes
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Create CORS middleware
export const corsMiddleware = cors(corsOptions);

// Custom CORS error handler middleware
export const corsErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.message && err.message.includes('not allowed by CORS policy')) {
    // Log the blocked request details
    SystemLogger.log('warn', 'CORS request blocked', {
      req,
      metadata: {
        origin: req.headers.origin,
        user_agent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
      }
    });
    
    // Set Vary header
    res.setHeader('Vary', 'Origin');
    
    // Send structured error response
    sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Origin not allowed by CORS policy');
    return;
  }
  
  next(err);
};

// Middleware to add Vary header to all responses
export const addVaryHeader = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Vary', 'Origin');
  next();
};

// Helper function to check if origin is allowed (for logging purposes)
export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow requests with no origin
  
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
};

// Debug function to log CORS configuration (development only)
export const logCorsConfig = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('CORS Configuration:');
    console.log('- Allowed origins:', getAllowedOrigins());
    console.log('- Credentials:', corsOptions.credentials);
    console.log('- Methods:', corsOptions.methods);
    console.log('- Allowed headers:', corsOptions.allowedHeaders);
    console.log('- Exposed headers:', corsOptions.exposedHeaders);
    console.log('- Max age:', corsOptions.maxAge);
  }
};

// Middleware factory for applying CORS to specific routes
export const createCorsMiddleware = (routePattern?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply CORS to API routes if pattern is specified
    if (routePattern && !req.path.startsWith(routePattern)) {
      return next();
    }
    
    // Apply CORS middleware
    corsMiddleware(req, res, (err) => {
      if (err) {
        corsErrorHandler(err, req, res, next);
        return;
      }
      
      // Add Vary header
      addVaryHeader(req, res, next);
    });
  };
};

// Development CORS bypass (only for internal tools)
export const developmentCorsOverride = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development' && process.env.CORS_BYPASS === 'true') {
    console.warn('⚠️  CORS BYPASS ENABLED - Only use for development!');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
  }
  
  next();
};

// Security headers middleware (related to CORS)
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};
