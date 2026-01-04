/**
 * Admin Password Change API
 * POST /api/admin/change-password - Change admin password
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 * Requirements: 6.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/db/adapter';
import { 
  verifyJWTWithFallback, 
  verifyPasswordWithFallback, 
  hashPassword,
  ADMIN_COOKIE 
} from '@/lib/utils/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_COOKIE)?.value || 
                 request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = await verifyJWTWithFallback(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const adapter = getAdapter();
    
    // Query for admin user (D1/SQLite syntax)
    const adminResult = await adapter.query<Record<string, unknown>>(
      'SELECT * FROM admin_users WHERE id = ?',
      [decoded.userId]
    );
    const admin = (adminResult.data || [])[0];

    if (!admin) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isValid = await verifyPasswordWithFallback(currentPassword, admin.password_hash as string);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    const newPasswordHash = await hashPassword(newPassword);
    
    await adapter.execute(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, decoded.userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
