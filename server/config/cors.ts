import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { ERROR_CODES, sendErrorResponse } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

// Define allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const origins = [];
  
  // Production domains
  origins.push('https://briskly-playful-sandwich.instance.app');
  
  // More permissive instance.app patterns for builds
  origins.push('https://preview--briskly-playful-sandwich.instance.app');
  origins.push('https://staging--briskly-playful-sandwich.instance.app');
  
  // Development origins (only in non-production environments)
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173');
    origins.push('http://127.0.0.1:5173');
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
    origins.push('http://localhost:3001');
    origins.push('http://127.0.0.1:3001');
  }
  
  return origins;
};

// Custom origin validation function with VERY permissive instance.app support
const validateOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Allow requests with no origin (e.g., mobile apps, server-to-server, same-origin)
  if (!origin) {
    callback(null, true);
    return;
  }
  
  // Check if origin is in allowlist
  if (allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  
  // VERY permissive: Allow any instance.app subdomain or build preview
  if (origin.includes('.instance.app') || origin.includes('instance.app')) {
    callback(null, true);
    return;
  }
  
  // Allow localhost in development with any port
  if (process.env.NODE_ENV !== 'production' && 
      (origin.startsWith('http://localhost:') || 
       origin.startsWith('http://127.0.0.1:') ||
       origin.startsWith('https://localhost:') ||
       origin.startsWith('https://127.0.0.1:'))) {
    callback(null, true);
    return;
  }
  
  // In production, be more lenient with build processes
  if (process.env.NODE_ENV === 'production' && 
      (origin.includes('vercel.app') || 
       origin.includes('netlify.app') || 
       origin.includes('instance.app') ||
       origin.includes('mimo.run') ||
       origin.includes('github.io'))) {
    callback(null, true);
    return;
  }
  
  // Log blocked origin attempt with more context
  console.warn(`CORS: Blocked origin attempt: ${origin}`);
  console.warn(`CORS: Allowed origins:`, allowedOrigins);
  SystemLogger.log('warn', 'CORS origin blocked', {
    metadata: {
      blocked_origin: origin,
      allowed_origins: allowedOrigins,
      timestamp: new Date().toISOString()
    }
  });
  
  callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
};

// CORS configuration - VERY PERMISSIVE for deployment
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
    'X-Forwarded-For',
    'X-Forwarded-Host',
    'X-Forwarded-Proto'
  ],
  exposedHeaders: [
    'Content-Disposition',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 600,
  optionsSuccessStatus: 200
};

// Create CORS middleware
export const corsMiddleware = cors(corsOptions);

// Custom CORS error handler middleware
export const corsErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.message && err.message.includes('not allowed by CORS policy')) {
    console.warn('CORS Error Details:', {
      origin: req.headers.origin,
      host: req.headers.host,
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      allowedOrigins: getAllowedOrigins()
    });
    
    SystemLogger.log('warn', 'CORS request blocked', {
      req,
      metadata: {
        origin: req.headers.origin,
        host: req.headers.host,
        user_agent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        allowed_origins: getAllowedOrigins(),
        timestamp: new Date().toISOString()
      }
    });
    
    res.setHeader('Vary', 'Origin');
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
  if (!origin) return true;
  
  const allowedOrigins = getAllowedOrigins();
  
  if (allowedOrigins.includes(origin)) return true;
  
  // Very permissive check for instance.app and build platforms
  if (origin.includes('.instance.app') || 
      origin.includes('instance.app') ||
      origin.includes('mimo.run') ||
      origin.includes('vercel.app') ||
      origin.includes('netlify.app')) return true;
  
  if (process.env.NODE_ENV !== 'production' && 
      (origin.startsWith('http://localhost:') || 
       origin.startsWith('http://127.0.0.1:') ||
       origin.startsWith('https://localhost:') ||
       origin.startsWith('https://127.0.0.1:'))) {
    return true;
  }
  
  return false;
};

// Debug function to log CORS configuration
export const logCorsConfig = () => {
  console.log('CORS Configuration:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- Allowed origins:', getAllowedOrigins());
  console.log('- Instance.app wildcard: ANY *.instance.app domain');
  console.log('- Build platforms: vercel.app, netlify.app, mimo.run');
  console.log('- Credentials:', corsOptions.credentials);
  console.log('- Methods:', corsOptions.methods);
  console.log('- Allowed headers:', corsOptions.allowedHeaders);
  console.log('- Exposed headers:', corsOptions.exposedHeaders);
  console.log('- Max age:', corsOptions.maxAge);
};

// Middleware factory for applying CORS to specific routes
export const createCorsMiddleware = (routePattern?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (routePattern && !req.path.startsWith(routePattern)) {
      return next();
    }
    
    corsMiddleware(req, res, (err) => {
      if (err) {
        corsErrorHandler(err, req, res, next);
        return;
      }
      
      addVaryHeader(req, res, next);
    });
  };
};

// Security headers middleware (VERY RELAXED for builds and deployment)
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Very relaxed CSP for deployment and builds
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; img-src 'self' data: blob: *; connect-src 'self' *; font-src 'self' data: *; media-src 'self' data: blob: *;");
  
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Add deployment-friendly headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  
  next();
};
