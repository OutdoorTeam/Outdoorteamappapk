import jwt from 'jsonwebtoken';
import { db } from '../database.js';
import { sendErrorResponse, ERROR_CODES } from '../utils/validation.js';
import { SystemLogger } from '../utils/logging.js';
import type { Request, Response, NextFunction } from 'express';
import { getJwtConfig } from '../config/security.js';

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
    const { secret, algorithm } = getJwtConfig();
    const decoded = jwt.verify(token, secret, { algorithms: [algorithm] }) as any;
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', decoded.id)
      .executeTakeFirst();

    if (!user) {
      await SystemLogger.logAuthError('User not found for token', undefined, req);
      sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Usuario no encontrado');
      return;
    }

    if (!user.is_active) {
      await SystemLogger.logAuthError('Inactive user attempted access', user.email, req);
      sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Cuenta desactivada');
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    await SystemLogger.logAuthError('Invalid token', undefined, req);
    sendErrorResponse(res, ERROR_CODES.AUTHENTICATION_ERROR, 'Token inválido');
    return;
  }
};

// Admin middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    sendErrorResponse(res, ERROR_CODES.AUTHORIZATION_ERROR, 'Acceso denegado. Se requieren permisos de administrador.');
    return;
  }
  next();
};
