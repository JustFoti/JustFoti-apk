/**
 * Admin Authentication API
 * POST /api/admin/auth - Login
 * DELETE /api/admin/auth - Logout
 * 
 * Migrated to use D1 database and Web Crypto API for Cloudflare Workers compatibility.
 * Requirements: 6.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateAdmin, 
  ADMIN_COOKIE 
} from '@/lib/utils/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Authenticate using the updated admin-auth utilities
    const authResult = await authenticateAdmin(username, password);

    if (!authResult.success || !authResult.token || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: authResult.user.id,
        username: authResult.user.username,
        role: authResult.user.role,
      },
    });

    // Set secure cookie
    response.cookies.set(ADMIN_COOKIE, authResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    
    // Delete cookie
    response.cookies.delete(ADMIN_COOKIE);

    return response;
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
