import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create DOMPurify instance for server-side
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// Standard API error response interface
export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
} as const;

// Validation middleware factory
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const result = schema.safeParse(data);

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach(err => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });

        const errorResponse: ApiErrorResponse = {
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid data provided',
            fieldErrors
          }
        };

        console.log('Validation error:', {
          route: req.route?.path || req.path,
          errors: fieldErrors,
          data: data
        });

        res.status(400).json(errorResponse);
        return;
      }

      // Replace the original data with validated and transformed data
      req[target] = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      const errorResponse: ApiErrorResponse = {
        error: {
          code: ERROR_CODES.SERVER_ERROR,
          message: 'Internal validation error'
        }
      };
      res.status(500).json(errorResponse);
    }
  };
}

// File validation utility
export function validateFile(
  file: Express.Multer.File,
  options: {
    allowedMimeTypes: string[];
    maxSizeBytes: number;
  }
): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (!options.allowedMimeTypes.includes(file.mimetype)) {
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed types: ${options.allowedMimeTypes.join(', ')}` 
    };
  }

  if (file.size > options.maxSizeBytes) {
    const maxSizeMB = Math.round(options.maxSizeBytes / (1024 * 1024));
    return { 
      isValid: false, 
      error: `File too large. Maximum size: ${maxSizeMB}MB` 
    };
  }

  return { isValid: true };
}

// Content sanitization utility
export function sanitizeContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove HTML tags and potential XSS
  const cleaned = purify.sanitize(content, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  return cleaned.trim();
}

// Password validation utility
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Create standardized error response
export function createErrorResponse(
  code: string,
  message: string,
  fieldErrors?: Record<string, string>
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(fieldErrors && { fieldErrors })
    }
  };
}

// HTTP status code mapping
export function getHttpStatusForErrorCode(code: string): number {
  switch (code) {
    case ERROR_CODES.VALIDATION_ERROR:
      return 400;
    case ERROR_CODES.AUTHENTICATION_ERROR:
      return 401;
    case ERROR_CODES.AUTHORIZATION_ERROR:
      return 403;
    case ERROR_CODES.NOT_FOUND_ERROR:
      return 404;
    case ERROR_CODES.DUPLICATE_ERROR:
      return 409;
    case ERROR_CODES.FILE_UPLOAD_ERROR:
      return 400;
    case ERROR_CODES.RATE_LIMIT_ERROR:
      return 429;
    case ERROR_CODES.SERVER_ERROR:
    default:
      return 500;
  }
}

// Error response helper
export function sendErrorResponse(
  res: Response,
  code: string,
  message: string,
  fieldErrors?: Record<string, string>
) {
  const statusCode = getHttpStatusForErrorCode(code);
  const errorResponse = createErrorResponse(code, message, fieldErrors);
  res.status(statusCode).json(errorResponse);
}
