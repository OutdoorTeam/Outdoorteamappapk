
import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { ERROR_CODES, sendErrorResponse } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

// Define allowed origins based on environment
const getAllowedOrigins = (): (string | RegExp)[] => {
  const origins: (string | RegExp)[] = [];
  
  // Production domains
  origins.push('https://briskly-playful-sandwich.instance.app');
  
  // Allow any subdomain of instance.app for previews and staging
  origins.push(/\.instance\.app$/);
  
  // Development origins (only in non-production environments)
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173');
    origins.push('http://127.0.0.1:5173');
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
    origins.push('http://localhost:3001');
    origins.push('http://127.0.0.1:3001');
    // Allow any localhost port for flexibility in dev
    origins.push(/http:\/\/localhost:(\d+)$/);
    origins.push(/http:\/\/127.0.0.1:(\d+)$/);
  }
  
  return origins;
};

// Custom origin validation function
const validateOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Allow requests with no origin (e.g., mobile apps, server-to-server, same-origin)
  if (!origin) {
    callback(null, true);
    return;
  }
  
  // Check if origin matches any of the allowed origins (string or regex)
  for (const allowedOrigin of allowedOrigins) {
    if (typeof allowedOrigin === 'string' && allowedOrigin === origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
      callback(null, true);
      return;
    }
  }
  
  // Log blocked origin attempt
  console.warn(`CORS: Blocked origin attempt: ${origin}`);
  SystemLogger.log('warn', 'CORS origin blocked', {
    metadata: {
      blocked_origin: origin,
      allowed_origins: allowedOrigins.map(o => o.toString()),
      timestamp: new Date().toISOString()
    }
  });
  
  callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
};

// CORS configuration
export const corsOptions: CorsOptions = {
  origin: validateOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'Accept',
    'X-Requested-With',
    'Origin',
    'X-Internal-API-Key',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: [
    'Content-Disposition',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204 // Use 204 for preflight success
};

// Create CORS middleware
export const corsMiddleware = cors(corsOptions);

// Custom CORS error handler middleware
export const corsErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.message && err.message.includes('not allowed by CORS policy')) {
    const origin = req.headers.origin;
    console.warn('CORS Error Details:', {
      origin: origin,
      host: req.headers.host,
      method: req.method,
      path: req.path,
    });
    
    SystemLogger.log('warn', 'CORS request blocked', {
      req,
      metadata: {
        origin: origin,
        host: req.headers.host,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
      }
    });
    
    sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, `Origin ${origin} not allowed by CORS policy`);
    return;
  }
  
  next(err);
};

// Debug function to log CORS configuration
export const logCorsConfig = () => {
  console.log('CORS Configuration:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- Allowed origins:', getAllowedOrigins().map(o => o.toString()));
  console.log('- Credentials:', corsOptions.credentials);
  console.log('- Methods:', corsOptions.methods);
  console.log('- Allowed headers:', corsOptions.allowedHeaders);
  console.log('- Exposed headers:', corsOptions.exposedHeaders);
  console.log('- Max age:', corsOptions.maxAge);
};
