// Comprehensive error handling utilities

export interface AuthError {
  type: 'EMPLOYEE_CREATION_FAILED' | 'USER_NOT_AUTHENTICATED' | 'DATABASE_ACCESS_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: any;
  retryable: boolean;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: AuthError;
}

export const createAuthError = (
  type: AuthError['type'], 
  message: string, 
  details?: any, 
  retryable: boolean = false
): AuthError => ({
  type,
  message,
  details,
  retryable
});

export const handleAuthError = (error: AuthError, retryCount: number = 0): string => {
  switch (error.type) {
    case 'EMPLOYEE_CREATION_FAILED':
      if (error.retryable && retryCount < 3) {
        return 'Creating your employee record... Please wait.';
      } else {
        return 'Unable to create employee record. Please refresh the page or contact support.';
      }
    
    case 'USER_NOT_AUTHENTICATED':
      return 'Please log in to continue.';
    
    case 'DATABASE_ACCESS_DENIED':
      return 'Database access denied. Please refresh the page and try again.';
    
    case 'NETWORK_ERROR':
      return 'Network connection issue. Please check your internet connection and try again.';
    
    default:
      return 'An unexpected error occurred. Please try again or contact support.';
  }
};

export const isRetryableError = (error: any): boolean => {
  if (!error) return false;
  
  // Network errors are usually retryable
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return true;
  }
  
  // Database connection errors are retryable
  if (error.code === 'PGRST301' || error.code === 'PGRST116') {
    return true;
  }
  
  // Timeout errors are retryable
  if (error.message?.includes('timeout')) {
    return true;
  }
  
  return false;
};

export const logError = (context: string, error: any, additionalInfo?: any) => {
  console.error(`[${context}] Error:`, {
    error,
    message: error?.message,
    code: error?.code,
    details: error?.details,
    additionalInfo,
    timestamp: new Date().toISOString()
  });
};

export const createOperationResult = <T>(
  success: boolean, 
  data?: T, 
  error?: AuthError
): OperationResult<T> => ({
  success,
  data,
  error
});