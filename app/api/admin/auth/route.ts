/**
 * Admin Authentication API
 * POST /api/admin/auth - Login
 * DELETE /api/admin/auth - Logout
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initializeDB, getDB } from '@/lib/db/server-connection';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_COOKIE = 'admin_token';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Initialize database and get admin user
    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    
    let adminQuery, updateQuery;
    if (db.isUsingNeon()) {
      adminQuery = 'SELECT * FROM admin_users WHERE username = $1';
      updateQuery = 'UPDATE admin_users SET last_login = $1 WHERE id = $2';
    } else {
      adminQuery = 'SELECT * FROM admin_users WHERE username = ?';
      updateQuery = 'UPDATE admin_users SET last_login = ? WHERE id = ?';
    }
    
    const adminResult = await adapter.query(adminQuery, [username]);
    const admin = adminResult[0];

    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await adapter.execute(updateQuery, [Date.now(), admin.id]);

    // Create JWT token
    const token = jwt.sign(
      { userId: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
      },
    });

    // Set secure cookie
    response.cookies.set(ADMIN_COOKIE, token, {
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
