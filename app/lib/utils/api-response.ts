/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response formats across all admin API endpoints.
 * Implements Requirements 16.2, 16.4, 16.5
 */

import { NextResponse } from 'next/server';

/**
 * Standard API response interface
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  timestamp: number;
}

/**
 * Standard error codes for API responses
 */
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors (400)
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  
  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  options?: {
    message?: string;
    pagination?: APIResponse['pagination'];
    status?: number;
  }
): NextResponse<APIResponse<T>> {
  const response: APIResponse<T> = {
    success: true,
    data,
    timestamp: Date.now(),
  };

  if (options?.message) {
    response.message = options.message;
  }

  if (options?.pagination) {
    response.pagination = options.pagination;
  }

  return NextResponse.json(response, { status: options?.status || 200 });
}

/**
 * Create an error API response
 */
export function errorResponse(
  error: string,
  options?: {
    code?: ErrorCode;
    status?: number;
    details?: Record<string, any>;
  }
): NextResponse<APIResponse> {
  const status = options?.status || 500;
  
  const response: APIResponse = {
    success: false,
    error,
    code: options?.code || getDefaultErrorCode(status),
    timestamp: Date.now(),
  };

  // Log server errors
  if (status >= 500) {
    console.error(`[API Error] ${options?.code || 'INTERNAL_ERROR'}: ${error}`, options?.details);
  }

  return NextResponse.json(response, { status });
}

/**
 * Create an unauthorized response (401)
 */
export function unauthorizedResponse(
  message: string = 'Authentication required'
): NextResponse<APIResponse> {
  return errorResponse(message, {
    code: ErrorCodes.UNAUTHORIZED,
    status: 401,
  });
}

/**
 * Create a forbidden response (403)
 */
export function forbiddenResponse(
  message: string = 'Insufficient permissions'
): NextResponse<APIResponse> {
  return errorResponse(message, {
    code: ErrorCodes.FORBIDDEN,
    status: 403,
  });
}

/**
 * Create a bad request response (400)
 */
export function badRequestResponse(
  message: string,
  code: ErrorCode = ErrorCodes.BAD_REQUEST
): NextResponse<APIResponse> {
  return errorResponse(message, {
    code,
    status: 400,
  });
}

/**
 * Create a not found response (404)
 */
export function notFoundResponse(
  message: string = 'Resource not found'
): NextResponse<APIResponse> {
  return errorResponse(message, {
    code: ErrorCodes.NOT_FOUND,
    status: 404,
  });
}

/**
 * Create an internal server error response (500)
 */
export function internalErrorResponse(
  message: string = 'Internal server error',
  error?: Error
): NextResponse<APIResponse> {
  if (error) {
    console.error('[Internal Error]', error);
  }
  
  return errorResponse(message, {
    code: ErrorCodes.INTERNAL_ERROR,
    status: 500,
  });
}

/**
 * Get default error code based on HTTP status
 */
function getDefaultErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCodes.BAD_REQUEST;
    case 401:
      return ErrorCodes.UNAUTHORIZED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.NOT_FOUND;
    case 409:
      return ErrorCodes.CONFLICT;
    default:
      return ErrorCodes.INTERNAL_ERROR;
  }
}

/**
 * Wrap an async handler with standardized error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<APIResponse<T>>>
): Promise<NextResponse<APIResponse<T>>> {
  return handler().catch((error: Error) => {
    console.error('[API Handler Error]', error);
    return internalErrorResponse(
      'An unexpected error occurred',
      error
    ) as NextResponse<APIResponse<T>>;
  });
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(
    field => body[field] === undefined || body[field] === null || body[field] === ''
  );
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: number,
  endDate: number
): { valid: boolean; error?: string } {
  if (isNaN(startDate) || isNaN(endDate)) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  if (startDate >= endDate) {
    return { valid: false, error: 'Start date must be before end date' };
  }
  
  // Check if dates are reasonable (not before 2020, not more than 1 day in future)
  const minDate = new Date('2020-01-01').getTime();
  const maxDate = Date.now() + 24 * 60 * 60 * 1000;
  
  if (startDate < minDate || endDate > maxDate) {
    return { valid: false, error: 'Date range is out of valid bounds' };
  }
  
  return { valid: true };
}
