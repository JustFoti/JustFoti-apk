/**
 * Admin Sessions API
 * GET /api/admin/sessions - Get watch sessions with pagination
 * 
 * Implements standardized response format per Requirements 16.2, 16.3, 16.4, 16.5
 */

import { NextRequest } from 'next/server';
import { initializeDB } from '@/app/lib/db/neon-connection';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from '@/app/lib/utils/api-response';

export async function GET(req: NextRequest) {
    try {
        // Verify admin authentication - Requirements 16.3
        const authResult = await verifyAdminAuth(req);
        if (!authResult.success) {
            return unauthorizedResponse(authResult.error || 'Authentication required');
        }

        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        const db = await initializeDB();

        // Fetch sessions with user and content details
        const sessionsQuery = `
      SELECT 
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
      LIMIT $1 OFFSET $2
    `;

        const countQuery = `SELECT COUNT(*) as total FROM watch_sessions`;

        // Use getAdapter().query() as the db instance itself doesn't expose query()
        const sessionsResult = await db.getAdapter().query(sessionsQuery, [limit, offset]);
        const countResult = await db.getAdapter().query(countQuery);

        // Handle potential difference in return type (rows array vs result object)
        const sessions = Array.isArray(sessionsResult) ? sessionsResult : (sessionsResult as any).rows || [];

        // Handle count result safely
        let total = 0;
        if (Array.isArray(countResult) && countResult.length > 0) {
            total = parseInt(countResult[0].total || countResult[0].count || '0');
        } else if ((countResult as any).rows && (countResult as any).rows.length > 0) {
            total = parseInt((countResult as any).rows[0].total || (countResult as any).rows[0].count || '0');
        }

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
