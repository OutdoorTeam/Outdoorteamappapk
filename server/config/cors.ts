import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { ERROR_CODES, sendErrorResponse } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';

// Define allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const origins = [];
  
  // Production domains for outdoorteam.com
  if (process.env.NODE_ENV === 'production') {
    // Primary production domains
    origins.push('https://app.outdoorteam.com');
    origins.push('https://outdoorteam.com');
    origins.push('https://www.outdoorteam.com');
    
    // Add custom domains from environment variable
    const customDomains = process.env.ALLOWED_ORIGINS?.split(',') || [];
    origins.push(...customDomains.map(domain => domain.trim()));
    
    console.log('🌐 Production CORS configured for outdoorteam.com domains');
  }
  
  // Development origins (only in non-production environments)
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173');
    origins.push('http://127.0.0.1:5173');
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
    origins.push('http://localhost:4173'); // Vite preview mode
    
    console.log('🔧 Development CORS configured for localhost');
  }
  
  console.log('📋 CORS allowed origins:', origins);
  return origins;
};

// Custom origin validation function
const validateOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Allow requests with no origin (e.g., mobile apps, server-to-server, Postman, direct server access)
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
  console.warn(`🚫 CORS: Blocked origin attempt: ${origin}`);
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

// Debug function to log CORS configuration
export const logCorsConfig = () => {
  console.log('🌐 CORS Configuration:');
  console.log('   • Environment:', process.env.NODE_ENV || 'development');
  console.log('   • Allowed origins:', getAllowedOrigins());
  console.log('   • Credentials enabled:', corsOptions.credentials);
  console.log('   • Allowed methods:', corsOptions.methods);
  console.log('   • Max age:', corsOptions.maxAge, 'seconds');
  
  if (process.env.NODE_ENV === 'production') {
    console.log('   🏢 Production deployment ready for:');
    console.log('     - https://app.outdoorteam.com (main app)');
    console.log('     - https://outdoorteam.com (website)');
    console.log('     - https://www.outdoorteam.com (www redirect)');
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

// Security headers middleware (related to CORS)
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy for production
  const csp = process.env.NODE_ENV === 'production'
    ? "default-src 'self' https://app.outdoorteam.com https://outdoorteam.com; " +
      "script-src 'self' 'unsafe-inline' https://www.youtube.com https://www.googletagmanager.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "media-src 'self' https: blob:; " +
      "frame-src 'self' https://www.youtube.com https://youtube.com; " +
      "connect-src 'self' https://app.outdoorteam.com https://api.outdoorteam.com;"
    : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' ws: http: https:; frame-src 'self' https://www.youtube.com https://youtube.com;";
  
  res.setHeader('Content-Security-Policy', csp);
  
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HSTS for production (force HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Additional security headers for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  }
  
  next();
};
