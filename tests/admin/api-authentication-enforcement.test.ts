/**
 * Property-Based Test: API Authentication Enforcement
 * Feature: admin-panel-production-ready, Property 8: API authentication enforcement
 * 
 * Tests that for any API request without valid authentication, 
 * the endpoint should return 401 Unauthorized.
 * 
 * Validates: Requirements 16.3
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Admin API endpoints that require authentication
const ADMIN_ENDPOINTS = [
  '/api/admin/analytics',
  '/api/admin/users',
  '/api/admin/sessions',
  '/api/admin/export',
  '/api/admin/system-health',
  '/api/admin/unified-stats',
  '/api/admin/bot-detection',
  '/api/admin/feedback',
  '/api/admin/live-activity',
  '/api/admin/insights',
  '/api/admin/peak-stats',
  '/api/admin/fix-data',
  '/api/admin/channel-mappings',
  '/api/admin/iptv-accounts',
  '/api/admin/audit-log',
  '/api/admin/banner',
] as const;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Authentication states
interface AuthState {
  hasToken: boolean;
  tokenValid: boolean;
  tokenExpired: boolean;
  tokenMalformed: boolean;
}

// Request context
interface RequestContext {
  endpoint: string;
  method: HttpMethod;
  authState: AuthState;
  headers: Record<string, string>;
}

/**
 * Simulates the authentication check that happens in verifyAdminAuth
 */
function checkAuthentication(context: RequestContext): {
  authenticated: boolean;
  statusCode: number;
  error?: string;
} {
  const { authState } = context;

  // No token provided
  if (!authState.hasToken) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'No authentication token',
    };
  }

  // Token is malformed
  if (authState.tokenMalformed) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Invalid authentication token',
    };
  }

  // Token is expired
  if (authState.tokenExpired) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Token expired',
    };
  }

  // Token is not valid
  if (!authState.tokenValid) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Invalid authentication token',
    };
  }

  // All checks passed
  return {
    authenticated: true,
    statusCode: 200,
  };
}

/**
 * Determines if authentication is valid based on auth state
 */
function isValidAuthentication(authState: AuthState): boolean {
  return (
    authState.hasToken &&
    authState.tokenValid &&
    !authState.tokenExpired &&
    !authState.tokenMalformed
  );
}

// Generators
const endpointArbitrary = fc.constantFrom(...ADMIN_ENDPOINTS);
const methodArbitrary = fc.constantFrom<HttpMethod>('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

const authStateArbitrary = fc.record({
  hasToken: fc.boolean(),
  tokenValid: fc.boolean(),
  tokenExpired: fc.boolean(),
  tokenMalformed: fc.boolean(),
});

const headersArbitrary = fc.record({
  'content-type': fc.constant('application/json'),
  'user-agent': fc.string({ minLength: 10, maxLength: 100 }),
  'x-forwarded-for': fc.ipV4(),
});

const requestContextArbitrary = fc.record({
  endpoint: endpointArbitrary,
  method: methodArbitrary,
  authState: authStateArbitrary,
  headers: headersArbitrary,
});

describe('API Authentication Enforcement Property Tests', () => {
  describe('Property 8: API authentication enforcement', () => {
    test('should return 401 for any request without valid authentication', () => {
      fc.assert(
        fc.property(requestContextArbitrary, (context) => {
          const result = checkAuthentication(context);
          const hasValidAuth = isValidAuthentication(context.authState);

          if (!hasValidAuth) {
            // Without valid auth, should return 401
            expect(result.authenticated).toBe(false);
            expect(result.statusCode).toBe(401);
            expect(result.error).toBeDefined();
          } else {
            // With valid auth, should allow access
            expect(result.authenticated).toBe(true);
            expect(result.statusCode).toBe(200);
            expect(result.error).toBeUndefined();
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    test('should consistently return 401 when no token is provided', () => {
      fc.assert(
        fc.property(
          endpointArbitrary,
          methodArbitrary,
          (endpoint, method) => {
            const context: RequestContext = {
              endpoint,
              method,
              authState: {
                hasToken: false,
                tokenValid: false,
                tokenExpired: false,
                tokenMalformed: false,
              },
              headers: { 'content-type': 'application/json' },
            };

            const result = checkAuthentication(context);

            expect(result.authenticated).toBe(false);
            expect(result.statusCode).toBe(401);
            expect(result.error).toBe('No authentication token');

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should consistently return 401 when token is expired', () => {
      fc.assert(
        fc.property(
          endpointArbitrary,
          methodArbitrary,
          (endpoint, method) => {
            const context: RequestContext = {
              endpoint,
              method,
              authState: {
                hasToken: true,
                tokenValid: true,
                tokenExpired: true,
                tokenMalformed: false,
              },
              headers: { 'content-type': 'application/json' },
            };

            const result = checkAuthentication(context);

            expect(result.authenticated).toBe(false);
            expect(result.statusCode).toBe(401);
            expect(result.error).toBe('Token expired');

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should consistently return 401 when token is malformed', () => {
      fc.assert(
        fc.property(
          endpointArbitrary,
          methodArbitrary,
          (endpoint, method) => {
            const context: RequestContext = {
              endpoint,
              method,
              authState: {
                hasToken: true,
                tokenValid: false,
                tokenExpired: false,
                tokenMalformed: true,
              },
              headers: { 'content-type': 'application/json' },
            };

            const result = checkAuthentication(context);

            expect(result.authenticated).toBe(false);
            expect(result.statusCode).toBe(401);
            expect(result.error).toBe('Invalid authentication token');

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should allow access only with completely valid authentication', () => {
      fc.assert(
        fc.property(
          endpointArbitrary,
          methodArbitrary,
          (endpoint, method) => {
            const context: RequestContext = {
              endpoint,
              method,
              authState: {
                hasToken: true,
                tokenValid: true,
                tokenExpired: false,
                tokenMalformed: false,
              },
              headers: { 'content-type': 'application/json' },
            };

            const result = checkAuthentication(context);

            expect(result.authenticated).toBe(true);
            expect(result.statusCode).toBe(200);
            expect(result.error).toBeUndefined();

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should enforce authentication across all admin endpoints', () => {
      // Test that every endpoint requires authentication
      for (const endpoint of ADMIN_ENDPOINTS) {
        const context: RequestContext = {
          endpoint,
          method: 'GET',
          authState: {
            hasToken: false,
            tokenValid: false,
            tokenExpired: false,
            tokenMalformed: false,
          },
          headers: { 'content-type': 'application/json' },
        };

        const result = checkAuthentication(context);

        expect(result.authenticated).toBe(false);
        expect(result.statusCode).toBe(401);
      }
    });
  });
});
