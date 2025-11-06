/**
 * Admin User Info API
 * GET /api/admin/me - Get current admin user info
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { initializeDB, getDB } from '@/lib/db/neon-connection';

const ADMIN_COOKIE = 'admin_token';

export async function GET(request: NextRequest) {
  const requestId = `admin_me_${Date.now()}`;
  
  console.log(`[${requestId}] Admin me endpoint called`);
  
  try {
    // Get token from cookie
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    
    if (!token) {
      console.log(`[${requestId}] No admin token cookie found`);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
      console.log(`[${requestId}] Token verified for user:`, decoded.username);
    } catch (jwtError) {
      console.error(`[${requestId}] JWT verification failed:`, jwtError);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Initialize database and get user info
    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    
    let user;
    
    if (db.isUsingNeon()) {
      // PostgreSQL syntax for Neon
      const result = await adapter.query(
        'SELECT id, username, created_at, last_login FROM admin_users WHERE id = $1',
        [decoded.id]
      );
      user = result[0];
    } else {
      // SQLite syntax
      const result = await adapter.query(
        'SELECT id, username, created_at, last_login FROM admin_users WHERE id = ?',
        [decoded.id]
      );
      user = result[0];
    }
    
    if (!user) {
      console.log(`[${requestId}] User not found in database:`, decoded.id);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update last login timestamp
    const now = Date.now();
    
    try {
      if (db.isUsingNeon()) {
        await adapter.execute(
          'UPDATE admin_users SET last_login = $1 WHERE id = $2',
          [now, decoded.id]
        );
      } else {
        await adapter.execute(
          'UPDATE admin_users SET last_login = ? WHERE id = ?',
          [now, decoded.id]
        );
      }
      console.log(`[${requestId}] Updated last login for user:`, decoded.username);
    } catch (updateError) {
      console.error(`[${requestId}] Failed to update last login:`, updateError);
      // Don't fail the request for this
    }

    // Return user info (without sensitive data)
    const userInfo = {
      id: user.id,
      username: user.username,
      createdAt: user.created_at,
      lastLogin: now, // Use the current timestamp
    };

    console.log(`[${requestId}] Successfully retrieved user info for:`, decoded.username);
    
    return NextResponse.json({
      success: true,
      user: userInfo,
      requestId,
    });
    
  } catch (error) {
    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : {
      name: 'UnknownError',
      message: String(error),
      stack: undefined
    };
    
    console.error(`[${requestId}] Admin me endpoint failed:`, errorInfo);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        requestId,
        debug: process.env.NODE_ENV === 'development' ? errorInfo : undefined
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}