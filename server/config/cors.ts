import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { ERROR_CODES, sendErrorResponse } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

// Define allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const origins = [];
  
  // Production domains
  origins.push('https://app.mioutdoorteam.com');
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
    origins.push('http://localhost:5000'); // Additional dev ports
    origins.push('http://127.0.0.1:5000');
    origins.push('http://localhost:8080');
    origins.push('http://127.0.0.1:8080');
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
  
  // SUPER PERMISSIVE: Allow any instance.app domain
  if (origin.includes('instance.app')) {
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
  
  // In production or during builds, be very lenient with build processes
  if (origin.includes('vercel.app') || 
      origin.includes('netlify.app') || 
      origin.includes('instance.app') ||
      origin.includes('herokuapp.com') ||
      origin.includes('railway.app') ||
      origin.includes('fly.dev') ||
      origin.includes('render.com')) {
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

// CORS configuration - VERY PERMISSIVE for deployment issues
export const corsOptions: CorsOptions = {
  origin: validateOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'Accept',
    'X-Requested-With',
    'Origin',
    'X-Internal-API-Key',
    'Cache-Control',
    'Pragma',
    'Content-Length',
    'User-Agent',
    'X-Forwarded-For',
    'X-Real-IP',
    'Host',
    'Connection',
    'Accept-Encoding',
    'Accept-Language'
  ],
  exposedHeaders: [
    'Content-Disposition',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400, // Increased to 24 hours for better performance
  optionsSuccessStatus: 200,
  preflightContinue: false
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
  
  // Super permissive check for various deployment platforms
  if (origin.includes('instance.app') ||
      origin.includes('vercel.app') ||
      origin.includes('netlify.app') ||
      origin.includes('herokuapp.com') ||
      origin.includes('railway.app') ||
      origin.includes('fly.dev') ||
      origin.includes('render.com')) return true;
  
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
  console.log('- Build platforms: vercel.app, netlify.app, herokuapp.com, railway.app, fly.dev, render.com');
  console.log('- Credentials:', corsOptions.credentials);
  console.log('- Methods:', corsOptions.methods);
  console.log('- Allowed headers:', corsOptions.allowedHeaders);
  console.log('- Exposed headers:', corsOptions.exposedHeaders);
  console.log('- Max age:', corsOptions.maxAge);
  console.log('- Very permissive mode for deployment compatibility');
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

// Ultra-relaxed security headers middleware for build compatibility
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Ultra-permissive CSP for deployment compatibility
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; img-src 'self' data: blob: *; connect-src 'self' *; font-src 'self' data: *; frame-src *; object-src 'none';");
  
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Add permissive CORS headers as fallback
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-Requested-With, Origin');
  
  next();
};
