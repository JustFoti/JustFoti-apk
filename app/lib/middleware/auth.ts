/**
 * Authentication Middleware
 * Verify JWT tokens and protect admin routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookie } from '@/lib/utils/auth';
import type { JWTPayload } from '@/types/auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Middleware to verify authentication
 * Returns the decoded token payload if valid, null otherwise
 */
export function verifyAuth(request: NextRequest): JWTPayload | null {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);
  
  // If not in header, try cookie
  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    token = extractTokenFromCookie(cookieHeader);
  }
  
  if (!token) {
    return null;
  }
  
  // Verify and decode token
  return verifyToken(token);
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  );
}

/**
 * Middleware wrapper for protected routes
 * Usage: export const GET = withAuth(async (request, user) => { ... })
 */
export function withAuth(
  handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = verifyAuth(request);
    
    if (!user) {
      return unauthorizedResponse('Authentication required');
    }
    
    return handler(request, user);
  };
}

/**
 * Extract client IP from request
 */
export function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a generic identifier
  return 'unknown';
}
