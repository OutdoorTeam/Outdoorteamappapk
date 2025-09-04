
// Error handling utilities for API calls and form validation

export interface ApiErrorData {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: ApiErrorData;
}

// Custom ApiError class
export class ApiError extends Error {
  public status?: number;

  constructor(
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic API request function with error handling
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const config = { ...defaultOptions, ...options };
  
  // Merge headers properly
  config.headers = { ...defaultOptions.headers, ...options.headers };

  try {
    const response = await fetch(url, config);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorData: ApiErrorResponse | null = null;
      if (contentType?.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore if parsing fails
        }
      }
      
      const apiError = new ApiError(
        errorData?.error?.code || 'HTTP_ERROR',
        errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        errorData?.error?.fieldErrors
      );
      apiError.status = response.status;
      throw apiError;
    }
    
    // Handle successful responses
    if (response.status === 204) { // No Content
      return undefined as T;
    }

    if (contentType?.includes('application/json')) {
      return await response.json();
    } else {
      // For non-JSON responses, return the response itself or text
      return response.text() as unknown as T;
    }
  } catch (error) {
    // Re-throw ApiError instances
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors, timeout, etc.
    if (error instanceof TypeError) {
      throw new ApiError('NETWORK_ERROR', 'No se pudo conectar al servidor. Verifica tu conexión a internet.');
    }
    
    // Handle other errors
    throw new ApiError('UNKNOWN_ERROR', error instanceof Error ? error.message : 'Error desconocido');
  }
}

// Parse API error from various sources
export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ApiError('UNKNOWN_ERROR', error.message);
  }
  
  return new ApiError('UNKNOWN_ERROR', 'Error desconocido');
}

// Extract user-friendly error message
export function getErrorMessage(error: ApiError): string {
  // Map common error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'VALIDATION_ERROR': 'Los datos proporcionados no son válidos.',
    'AUTHENTICATION_ERROR': 'Credenciales inválidas. Por favor, verifica tu email y contraseña.',
    'AUTHORIZATION_ERROR': 'No tienes permisos para realizar esta acción.',
    'NOT_FOUND_ERROR': 'El recurso solicitado no fue encontrado.',
    'DUPLICATE_ERROR': 'Ya existe un registro con esta información.',
    'RATE_LIMIT_ERROR': 'Demasiadas solicitudes. Por favor, espera un momento.',
    'NETWORK_ERROR': 'Error de conexión. Verifica tu internet.',
    'FILE_UPLOAD_ERROR': 'Error al subir el archivo.',
    'SERVER_ERROR': 'Error interno del servidor. Intenta nuevamente.',
  };
  
  return errorMessages[error.code] || error.message || 'Error desconocido';
}

// Extract field errors for forms
export function getFieldErrors(error: ApiError): Record<string, string> {
  return error.fieldErrors || {};
}

// Check if error is authentication related
export function isAuthError(error: ApiError): boolean {
  return error.code === 'AUTHENTICATION_ERROR' || error.code === 'AUTHORIZATION_ERROR' || error.status === 401 || error.status === 403;
}

// Check if error is validation related
export function isValidationError(error: ApiError): boolean {
  return error.code === 'VALIDATION_ERROR';
}

// Helper for setting form errors in react-hook-form
export function setFormErrors(
  setError: (name: string, error: { message: string }) => void,
  fieldErrors: Record<string, string>
): void {
  Object.entries(fieldErrors).forEach(([field, message]) => {
    setError(field, { message });
  });
}

// Helper to focus first invalid field
export function focusFirstInvalidField(): void {
  setTimeout(() => {
    const firstErrorElement = document.querySelector('[aria-invalid="true"]') as HTMLElement;
    if (firstErrorElement) {
      firstErrorElement.focus();
    }
  }, 100);
}

// Retry logic for API calls
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: ApiError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = parseApiError(error);
      
      // Don't retry on validation or authentication errors
      if (isValidationError(lastError) || isAuthError(lastError)) {
        throw lastError;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

// Handle logout on auth errors
export function handleAuthError(): void {
  localStorage.removeItem('auth_token');
  window.location.href = '/login';
}
