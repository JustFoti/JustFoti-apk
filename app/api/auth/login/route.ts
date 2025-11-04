/**
 * Admin Login API Route
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db/queries';
import { verifyPassword, generateToken, createAuthCookie } from '@/lib/utils/auth';
import { loginRateLimiter } from '@/lib/utils/rate-limiter';
import { getClientIP } from '@/lib/middleware/auth';
import type { LoginCredentials, LoginResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    
    // Check rate limit
    if (loginRateLimiter.isRateLimited(clientIP)) {
      const resetTime = loginRateLimiter.getResetTime(clientIP);
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${resetTime} seconds.`,
        } as LoginResponse,
        { 
          status: 429,
          headers: {
            'Retry-After': resetTime.toString(),
          },
        }
      );
    }
    
    // Parse request body
    const body = await request.json() as LoginCredentials;
    const { username, password } = body;
    
    // Validate input
    if (!username || !password) {
      loginRateLimiter.recordAttempt(clientIP);
      return NextResponse.json(
        {
          success: false,
          error: 'Username and password are required',
        } as LoginResponse,
        { status: 400 }
      );
    }
    
    // Get admin user from database
    const admin = queries.admin.getAdminByUsername(username);
    
    if (!admin) {
      // Record failed attempt
      loginRateLimiter.recordAttempt(clientIP);
      
      // Generic error message to prevent username enumeration
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid username or password',
        } as LoginResponse,
        { status: 401 }
      );
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, admin.passwordHash);
    
    if (!isValidPassword) {
      // Record failed attempt
      loginRateLimiter.recordAttempt(clientIP);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid username or password',
        } as LoginResponse,
        { status: 401 }
      );
    }
    
    // Reset rate limiter on successful login
    loginRateLimiter.reset(clientIP);
    
    // Update last login time
    queries.admin.updateLastLogin(username);
    
    // Generate JWT token
    const user = {
      id: admin.id,
      username: admin.username,
      createdAt: admin.createdAt,
      lastLogin: Date.now(),
    };
    
    const token = generateToken(user);
    
    // Create response with HTTP-only cookie
    const response = NextResponse.json(
      {
        success: true,
        user,
      } as LoginResponse,
      { status: 200 }
    );
    
    // Set auth cookie
    response.headers.set('Set-Cookie', createAuthCookie(token));
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during login',
      } as LoginResponse,
      { status: 500 }
    );
  }
}
