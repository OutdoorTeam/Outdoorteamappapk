import jwt from 'jsonwebtoken';
import { db } from '../database.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'production-fallback-jwt-secret-8f7a6e5d4c3b2a1098765432109876543210fedcba0987654321abcdef123456';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Token de acceso requerido');
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', decoded.id)
      .executeTakeFirst();

    if (!user) {
      console.warn('User not found for valid token, user may have been deleted:', decoded.id);
      await SystemLogger.logAuthError('User not found for token', undefined, req);
      sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Usuario no encontrado');
      return;
    }

    if (!user.is_active) {
      console.warn('Inactive user attempted access:', user.email);
      await SystemLogger.logAuthError('Inactive user attempted access', user.email, req);
      sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Cuenta desactivada');
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    // Handle different JWT errors with more specific messaging
    if (error instanceof jwt.JsonWebTokenError) {
      if (error.message === 'invalid signature') {
        console.warn('JWT signature mismatch - token may be from different environment:', {
          tokenStart: token.substring(0, 20) + '...',
          secretStart: JWT_SECRET.substring(0, 8) + '...',
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        await SystemLogger.logAuthError('JWT signature mismatch', undefined, req);
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Sesión inválida. Por favor, inicia sesión nuevamente.');
        return;
      } else if (error.message === 'jwt expired') {
        console.warn('JWT token expired');
        await SystemLogger.logAuthError('JWT token expired', undefined, req);
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      } else if (error.message === 'jwt malformed') {
        console.warn('Malformed JWT token');
        await SystemLogger.logAuthError('Malformed JWT token', undefined, req);
        sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Token inválido');
        return;
      }
    }
    
    // Generic JWT error handling
    console.error('Token verification error:', error);
    await SystemLogger.logAuthError('Token verification failed', undefined, req);
    sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Token inválido');
    return;
  }
};

// Admin middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    console.warn('Non-admin user attempted admin access:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      route: req.path
    });
    sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado. Se requieren permisos de administrador.');
    return;
  }
  next();
};

// Helper function to validate JWT secret configuration
export const validateJWTConfig = (): void => {
  const currentSecret = process.env.JWT_SECRET || JWT_SECRET;
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) {
      console.error('❌ CRITICAL: JWT_SECRET environment variable not set in production!');
      console.error('   Using fallback secret (not secure for production)');
      throw new Error('JWT_SECRET must be set in production environment');
    }
    
    if (currentSecret.length < 32) {
      console.error('❌ CRITICAL: JWT_SECRET is too short for production (< 32 characters)!');
      console.error('   Current length:', currentSecret.length);
      throw new Error('JWT_SECRET must be at least 32 characters long in production');
    }
  } else {
    if (currentSecret.length < 32) {
      console.warn('⚠️  WARNING: JWT_SECRET is too short. Use at least 32 characters for security.');
      console.warn('   Current length:', currentSecret.length);
    }
  }
  
  console.log('✅ JWT configuration validated (length:', currentSecret.length, 'chars)');
};
