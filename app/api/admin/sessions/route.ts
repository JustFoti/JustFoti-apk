/**
 * Admin Sessions API
 * GET /api/admin/sessions - Get watch sessions with pagination
 * MIGRATED: Uses D1 database adapter for Cloudflare compatibility
 */

import { NextRequest } from 'next/server';
import { getAdapter } from '@/lib/db/adapter';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from '@/app/lib/utils/api-response';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error || 'Authentication required');
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const adapter = getAdapter();

    const sessionsResult = await adapter.query<Record<string, unknown>>(
      `SELECT 
        ws.id,
        ws.user_id,
        ws.content_id,
        ws.content_type,
        ws.started_at,
        ws.duration,
        ws.device_type,
        ws.ip_address,
        u.email as user_email,
        u.username as user_name
      FROM watch_sessions ws
      LEFT JOIN users u ON ws.user_id = u.id
      ORDER BY ws.started_at DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const countResult = await adapter.query<{ total: number }>(
      'SELECT COUNT(*) as total FROM watch_sessions'
    );

    const sessions = sessionsResult.data || [];
    const total = parseInt(String((countResult.data || [])[0]?.total)) || 0;

    return successResponse(
      { sessions },
      {
        pagination: {
          page,
          pageSize: limit,
          total,
          hasMore: page * limit < total,
        }
      }
    );

  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return internalErrorResponse('Failed to fetch sessions', error instanceof Error ? error : undefined);
  }
}
