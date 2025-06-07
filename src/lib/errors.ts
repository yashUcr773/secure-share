// Error handling utilities for SecureShare
// Provides centralized error handling and user-friendly error messages

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class SecureShareError extends Error {
  code?: string;
  status?: number;
  details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'SecureShareError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  // File operations
  'FILE_TOO_LARGE': 'File size exceeds the maximum limit',
  'FILE_TYPE_NOT_SUPPORTED': 'This file type is not supported',
  'FILE_UPLOAD_FAILED': 'Failed to upload file. Please try again',
  'FILE_NOT_FOUND': 'File not found or has expired',
  'FILE_DOWNLOAD_FAILED': 'Failed to download file. Please try again',
  
  // Authentication
  'INVALID_CREDENTIALS': 'Invalid email or password',
  'ACCOUNT_LOCKED': 'Account has been temporarily locked due to multiple failed attempts',
  'TOKEN_EXPIRED': 'Your session has expired. Please log in again',
  'UNAUTHORIZED': 'You are not authorized to perform this action',
  
  // Encryption
  'DECRYPTION_FAILED': 'Failed to decrypt file. Check your password',
  'ENCRYPTION_FAILED': 'Failed to encrypt file. Please try again',
  'INVALID_PASSWORD': 'Incorrect password for this file',
  
  // Rate limiting
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait before trying again',
  'TOO_MANY_UPLOADS': 'Upload limit reached. Please wait before uploading more files',
  
  // Network
  'NETWORK_ERROR': 'Network error. Please check your connection and try again',
  'SERVER_ERROR': 'Server error. Please try again later',
  'TIMEOUT': 'Request timed out. Please try again',
  
  // CSRF
  'CSRF_ERROR': 'Security token invalid. Please refresh the page and try again',
  'CSRF_MISSING': 'Security token missing. Please refresh the page',
  
  // General
  'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again',
  'MAINTENANCE': 'Service is temporarily unavailable for maintenance',
  'FEATURE_DISABLED': 'This feature is currently disabled',
};

export function getErrorMessage(error: any): string {
  // If it's already a user-friendly message, return as-is
  if (typeof error === 'string') {
    return error;
  }

  // Check if it's a SecureShareError with a code
  if (error instanceof SecureShareError && error.code) {
    return ERROR_MESSAGES[error.code] || error.message;
  }

  // Check for API error responses
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  // Check for fetch errors
  if (error?.message?.includes('Failed to fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // Check for timeout errors
  if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT;
  }

  // Check HTTP status codes
  if (error?.status) {
    switch (error.status) {
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 403:
        return ERROR_MESSAGES.CSRF_ERROR;
      case 404:
        return ERROR_MESSAGES.FILE_NOT_FOUND;
      case 413:
        return ERROR_MESSAGES.FILE_TOO_LARGE;
      case 429:
        return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
      case 500:
        return ERROR_MESSAGES.SERVER_ERROR;
      case 503:
        return ERROR_MESSAGES.MAINTENANCE;
      default:
        return ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }

  // Fallback to the error message or unknown error
  return error?.message || ERROR_MESSAGES.UNKNOWN_ERROR;
}

export function createError(
  message: string, 
  code?: string, 
  status?: number, 
  details?: any
): SecureShareError {
  return new SecureShareError(message, code, status, details);
}

// File validation errors
export function validateFileSize(file: File, maxSize: number): void {
  if (file.size > maxSize) {
    throw createError(
      `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`,
      'FILE_TOO_LARGE',
      413,
      { fileSize: file.size, maxSize }
    );
  }
}

export function validateFileType(file: File, allowedTypes: string[]): void {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!fileExtension || !allowedTypes.includes(`.${fileExtension}`)) {
    throw createError(
      `File type .${fileExtension} is not supported. Allowed types: ${allowedTypes.join(', ')}`,
      'FILE_TYPE_NOT_SUPPORTED',
      400,
      { fileType: fileExtension, allowedTypes }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Retry logic for network operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error instanceof SecureShareError) {
        if (['UNAUTHORIZED', 'CSRF_ERROR', 'FILE_NOT_FOUND'].includes(error.code || '')) {
          throw error;
        }
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError;
}
