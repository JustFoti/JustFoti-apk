/**
 * Admin Audit Log API
 * POST /api/admin/audit-log - Log administrative action
 * GET /api/admin/audit-log - Retrieve audit logs
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService, AuditLogService } from '@/app/admin/middleware/auth-server';
import { getAdapter } from '@/lib/db/adapter';

export async function POST(request: NextRequest) {
  try {
    const authResult = await AdminAuthService.authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const permissionCheck = AdminAuthService.checkPermissions(
      authResult.user,
      'audit_logs',
      'write'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions for audit logging' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { actionType, success = true, targetResource, targetId, details = {}, duration } = body;

    if (!actionType) {
      return NextResponse.json(
        { error: 'Action type is required' },
        { status: 400 }
      );
    }

    const enrichedDetails = {
      ...details,
      success,
      targetResource,
      targetId,
      duration
    };

    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    await AuditLogService.logAction(
      authResult.user.id,
      actionType,
      enrichedDetails,
      clientIP
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Audit log API error:', error);
    return NextResponse.json(
      { error: 'Failed to log audit entry' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await AdminAuthService.authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const permissionCheck = AdminAuthService.checkPermissions(
      authResult.user,
      'audit_logs',
      'read'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit logs' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId');
    const actionType = searchParams.get('actionType');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    const adapter = getAdapter();

    // Build query with SQLite-style placeholders
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }

    if (startTime) {
      query += ' AND timestamp >= ?';
      params.push(parseInt(startTime));
    }

    if (endTime) {
      query += ' AND timestamp <= ?';
      params.push(parseInt(endTime));
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await adapter.query<Record<string, unknown>>(query, params);
    const logs = result.data || [];

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      ...log,
      actionDetails: typeof log.action_details === 'string' 
        ? JSON.parse(log.action_details) 
        : log.action_details
    }));

    return NextResponse.json({
      success: true,
      logs: parsedLogs,
      pagination: {
        limit,
        offset,
        total: logs.length
      }
    });

  } catch (error) {
    console.error('Audit log retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve audit logs' },
      { status: 500 }
    );
  }
}
