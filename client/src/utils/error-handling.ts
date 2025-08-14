import { z } from 'zod';

// Error response interfaces matching backend
export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

// Error code constants
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

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.VALIDATION_ERROR]: 'Por favor revisa los datos ingresados',
  [ERROR_CODES.AUTHENTICATION_ERROR]: 'Credenciales inválidas. Verifica tu email y contraseña',
  [ERROR_CODES.AUTHORIZATION_ERROR]: 'No tienes permisos para realizar esta acción',
  [ERROR_CODES.NOT_FOUND_ERROR]: 'El recurso solicitado no fue encontrado',
  [ERROR_CODES.DUPLICATE_ERROR]: 'Los datos ingresados ya existen en el sistema',
  [ERROR_CODES.FILE_UPLOAD_ERROR]: 'Error al subir el archivo. Verifica el formato y tamaño',
  [ERROR_CODES.RATE_LIMIT_ERROR]: 'Demasiadas solicitudes. Intenta nuevamente en unos momentos',
  [ERROR_CODES.SERVER_ERROR]: 'Error interno del servidor. Intenta nuevamente más tarde'
};

// Parse API error from response
export function parseApiError(error: unknown): ApiError {
  // Handle fetch errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Error de conexión. Verifica tu conexión a internet'
    };
  }

  // Handle timeout errors
  if (error instanceof Error && error.name === 'TimeoutError') {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      message: 'La solicitud tardó demasiado tiempo. Intenta nuevamente'
    };
  }

  // Try to parse as API error response
  try {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = error as ApiErrorResponse;
      return apiError.error;
    }
  } catch {
    // Fall through to default error
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      message: error
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      message: error.message
    };
  }

  // Default error
  return {
    code: ERROR_CODES.SERVER_ERROR,
    message: 'Ocurrió un error inesperado'
  };
}

// Get user-friendly error message
export function getErrorMessage(error: ApiError): string {
  // Use custom message if it's user-friendly (not technical)
  if (error.message && !error.message.includes('Error:') && error.message.length < 200) {
    return error.message;
  }

  // Use predefined message for error code
  return ERROR_MESSAGES[error.code] || ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR];
}

// Get field errors for form validation
export function getFieldErrors(error: ApiError): Record<string, string> {
  return error.fieldErrors || {};
}

// Check if error is a validation error
export function isValidationError(error: ApiError): boolean {
  return error.code === ERROR_CODES.VALIDATION_ERROR;
}

// Check if error is an authentication error
export function isAuthError(error: ApiError): boolean {
  return error.code === ERROR_CODES.AUTHENTICATION_ERROR;
}

// Utility to make API requests with error handling
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const token = localStorage.getItem('auth_token');
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    // Handle non-JSON responses (like file downloads)
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response as T;
    }

    const data = await response.json();

    if (!response.ok) {
      throw data; // This will be caught and parsed as an API error
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// Utility for handling async operations with error handling
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  onError?: (error: ApiError) => void
): Promise<{ success: boolean; data?: T; error?: ApiError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const apiError = parseApiError(error);
    
    if (onError) {
      onError(apiError);
    }
    
    return { success: false, error: apiError };
  }
}

// React Hook Form error setter utility
export function setFormErrors<T extends Record<string, any>>(
  setError: (name: keyof T, error: { message: string }) => void,
  fieldErrors: Record<string, string>
): void {
  Object.entries(fieldErrors).forEach(([field, message]) => {
    setError(field as keyof T, { message });
  });
}

// Focus first invalid field utility
export function focusFirstInvalidField(container?: HTMLElement): void {
  const firstInvalid = (container || document).querySelector('[aria-invalid="true"]') as HTMLElement;
  if (firstInvalid) {
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Validation error announcer for screen readers
export function announceValidationErrors(errors: Record<string, string>): void {
  const errorCount = Object.keys(errors).length;
  if (errorCount === 0) return;

  const message = errorCount === 1 
    ? 'Se encontró 1 error en el formulario'
    : `Se encontraron ${errorCount} errores en el formulario`;

  // Create temporary live region for announcement
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'assertive');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.style.position = 'absolute';
  liveRegion.style.left = '-10000px';
  liveRegion.style.width = '1px';
  liveRegion.style.height = '1px';
  liveRegion.style.overflow = 'hidden';
  
  document.body.appendChild(liveRegion);
  liveRegion.textContent = message;

  // Clean up after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}
