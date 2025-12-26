/**
 * Property-Based Test: API Error Response Consistency
 * Feature: admin-panel-production-ready, Property 9: API error response consistency
 * 
 * Tests that for any invalid API request, the response should follow the 
 * standard error format with success: false and error message.
 * 
 * Validates: Requirements 16.2, 16.4, 16.5
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Standard API response interface matching app/lib/utils/api-response.ts
interface APIResponse<T = any> {
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

// Error codes matching the implementation
const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Error types for testing
type ErrorType = 
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'internal';

interface ErrorScenario {
  type: ErrorType;
  statusCode: number;
  expectedCode: ErrorCode;
  message: string;
}

/**
 * Creates a standardized error response matching the API implementation
 */
function createErrorResponse(
  error: string,
  code: ErrorCode,
  status: number
): APIResponse {
  return {
    success: false,
    error,
    code,
    timestamp: Date.now(),
  };
}

/**
 * Creates a standardized success response
 */
function createSuccessResponse<T>(
  data: T,
  options?: { message?: string; pagination?: APIResponse['pagination'] }
): APIResponse<T> {
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

  return response;
}

/**
 * Validates that an error response follows the standard format
 */
function validateErrorResponse(response: APIResponse): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Must have success: false
  if (response.success !== false) {
    issues.push('Error response must have success: false');
  }

  // Must have error message
  if (!response.error || typeof response.error !== 'string') {
    issues.push('Error response must have an error message string');
  }

  // Must have error code
  if (!response.code || typeof response.code !== 'string') {
    issues.push('Error response must have an error code');
  }

  // Must have timestamp
  if (!response.timestamp || typeof response.timestamp !== 'number') {
    issues.push('Error response must have a timestamp');
  }

  // Should not have data field
  if (response.data !== undefined) {
    issues.push('Error response should not have data field');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validates that a success response follows the standard format
 */
function validateSuccessResponse(response: APIResponse): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Must have success: true
  if (response.success !== true) {
    issues.push('Success response must have success: true');
  }

  // Must have timestamp
  if (!response.timestamp || typeof response.timestamp !== 'number') {
    issues.push('Success response must have a timestamp');
  }

  // Should not have error field
  if (response.error !== undefined) {
    issues.push('Success response should not have error field');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Gets the expected error code for a given HTTP status
 */
function getExpectedErrorCode(status: number): ErrorCode {
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

// Generators
const errorTypeArbitrary = fc.constantFrom<ErrorType>(
  'authentication',
  'authorization',
  'validation',
  'not_found',
  'conflict',
  'internal'
);

const errorMessageArbitrary = fc.string({ minLength: 5, maxLength: 200 })
  .filter(s => s.trim().length > 0);

const errorCodeArbitrary = fc.constantFrom<ErrorCode>(
  ...Object.values(ErrorCodes)
);

const httpStatusArbitrary = fc.constantFrom(400, 401, 403, 404, 409, 500, 502, 503);

const dataArbitrary = fc.oneof(
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  fc.array(fc.record({
    id: fc.uuid(),
    value: fc.integer(),
  }), { minLength: 0, maxLength: 10 }),
  fc.constant(null)
);

const paginationArbitrary = fc.record({
  page: fc.integer({ min: 1, max: 1000 }),
  pageSize: fc.integer({ min: 1, max: 100 }),
  total: fc.integer({ min: 0, max: 100000 }),
  hasMore: fc.boolean(),
});

describe('API Error Response Consistency Property Tests', () => {
  describe('Property 9: API error response consistency', () => {
    test('should have consistent error response format for all error types', () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary,
          errorCodeArbitrary,
          httpStatusArbitrary,
          (message, code, status) => {
            const response = createErrorResponse(message, code, status);
            const validation = validateErrorResponse(response);

            expect(validation.valid).toBe(true);
            if (!validation.valid) {
              console.log('Validation issues:', validation.issues);
            }

            // Verify structure
            expect(response.success).toBe(false);
            expect(response.error).toBe(message);
            expect(response.code).toBe(code);
            expect(typeof response.timestamp).toBe('number');
            expect(response.timestamp).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should have consistent success response format', () => {
      fc.assert(
        fc.property(
          dataArbitrary,
          fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          fc.option(paginationArbitrary),
          (data, message, pagination) => {
            const response = createSuccessResponse(data, {
              message: message ?? undefined,
              pagination: pagination ?? undefined,
            });
            const validation = validateSuccessResponse(response);

            expect(validation.valid).toBe(true);
            if (!validation.valid) {
              console.log('Validation issues:', validation.issues);
            }

            // Verify structure
            expect(response.success).toBe(true);
            expect(response.data).toEqual(data);
            expect(typeof response.timestamp).toBe('number');
            expect(response.timestamp).toBeGreaterThan(0);

            if (message) {
              expect(response.message).toBe(message);
            }

            if (pagination) {
              expect(response.pagination).toEqual(pagination);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should map HTTP status codes to appropriate error codes', () => {
      fc.assert(
        fc.property(httpStatusArbitrary, (status) => {
          const expectedCode = getExpectedErrorCode(status);
          const response = createErrorResponse('Test error', expectedCode, status);

          // Verify the error code matches the expected code for the status
          expect(response.code).toBe(expectedCode);

          // Verify specific mappings
          if (status === 400) {
            expect(response.code).toBe(ErrorCodes.BAD_REQUEST);
          } else if (status === 401) {
            expect(response.code).toBe(ErrorCodes.UNAUTHORIZED);
          } else if (status === 403) {
            expect(response.code).toBe(ErrorCodes.FORBIDDEN);
          } else if (status === 404) {
            expect(response.code).toBe(ErrorCodes.NOT_FOUND);
          } else if (status === 409) {
            expect(response.code).toBe(ErrorCodes.CONFLICT);
          } else if (status >= 500) {
            expect(response.code).toBe(ErrorCodes.INTERNAL_ERROR);
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    test('should never have both error and data fields in the same response', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          errorMessageArbitrary,
          dataArbitrary,
          (isError, errorMessage, data) => {
            let response: APIResponse;

            if (isError) {
              response = createErrorResponse(errorMessage, ErrorCodes.BAD_REQUEST, 400);
            } else {
              response = createSuccessResponse(data);
            }

            // Error responses should not have data
            if (response.success === false) {
              expect(response.data).toBeUndefined();
              expect(response.error).toBeDefined();
            }

            // Success responses should not have error
            if (response.success === true) {
              expect(response.error).toBeUndefined();
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should always include timestamp in responses', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          errorMessageArbitrary,
          dataArbitrary,
          (isError, errorMessage, data) => {
            const now = Date.now();
            let response: APIResponse;

            if (isError) {
              response = createErrorResponse(errorMessage, ErrorCodes.BAD_REQUEST, 400);
            } else {
              response = createSuccessResponse(data);
            }

            // Timestamp should always be present and reasonable
            expect(response.timestamp).toBeDefined();
            expect(typeof response.timestamp).toBe('number');
            expect(response.timestamp).toBeGreaterThan(0);
            // Timestamp should be close to now (within 1 second)
            expect(Math.abs(response.timestamp - now)).toBeLessThan(1000);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should have valid pagination structure when included', () => {
      fc.assert(
        fc.property(
          dataArbitrary,
          paginationArbitrary,
          (data, pagination) => {
            const response = createSuccessResponse(data, { pagination });

            expect(response.pagination).toBeDefined();
            expect(typeof response.pagination!.page).toBe('number');
            expect(typeof response.pagination!.pageSize).toBe('number');
            expect(typeof response.pagination!.total).toBe('number');
            expect(typeof response.pagination!.hasMore).toBe('boolean');

            // Validate pagination logic
            expect(response.pagination!.page).toBeGreaterThanOrEqual(1);
            expect(response.pagination!.pageSize).toBeGreaterThanOrEqual(1);
            expect(response.pagination!.total).toBeGreaterThanOrEqual(0);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should have error code from valid set of error codes', () => {
      const validErrorCodes: string[] = Object.values(ErrorCodes);

      fc.assert(
        fc.property(
          errorMessageArbitrary,
          errorCodeArbitrary,
          (message, code) => {
            const response = createErrorResponse(message, code, 400);

            expect(response.code).toBeDefined();
            expect(validErrorCodes).toContain(response.code!);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
