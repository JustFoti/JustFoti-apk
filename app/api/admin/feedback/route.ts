/**
 * Admin Feedback API
 * GET /api/admin/feedback - Get feedback items with filtering and pagination
 * PATCH /api/admin/feedback - Update feedback status
 * DELETE /api/admin/feedback - Delete feedback item
 * 
 * Migrated from Neon PostgreSQL to Cloudflare D1
 * Implements standardized response format per Requirements 16.2, 16.4, 16.5
 * Requirements: 13.9
 */

import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdapter } from '@/app/lib/db/adapter';
import {
  successResponse,
  unauthorizedResponse,
  badRequestResponse,
  internalErrorResponse,
  ErrorCodes,
} from '@/app/lib/utils/api-response';

interface Feedback {
  id: number;
  type: string;
  message: string;
  email: string | null;
  url: string | null;
  user_agent: string | null;
  ip_address: string | null;
  screenshot: string | null;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StatusCount {
  status: string;
  count: number;
}

interface TypeCount {
  type: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication - Requirements 16.3
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error || 'Authentication required');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get database adapter (uses D1 in Cloudflare environment)
    const db = getAdapter();

    // Build query with conditions
    let query = 'SELECT * FROM feedback';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get feedback with pagination
    const feedbackResult = await db.query<Feedback>(query, params);
    
    if (feedbackResult.error) {
      console.error('Error fetching feedback:', feedbackResult.error);
      return internalErrorResponse('Failed to fetch feedback');
    }

    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) as total FROM feedback';
    const countParams: unknown[] = [];
    
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
      // Re-add filter params (without limit/offset)
      if (status !== 'all') countParams.push(status);
      if (type !== 'all') countParams.push(type);
    }

    const countResult = await db.queryFirst<{ total: number }>(countQuery, countParams);
    const total = countResult.data?.total || 0;

    // Get counts by status
    const statusCountsResult = await db.query<StatusCount>(
      'SELECT status, COUNT(*) as count FROM feedback GROUP BY status'
    );

    // Get counts by type
    const typeCountsResult = await db.query<TypeCount>(
      'SELECT type, COUNT(*) as count FROM feedback GROUP BY type'
    );

    // Build stats objects
    const byStatus: Record<string, number> = {};
    if (statusCountsResult.data) {
      statusCountsResult.data.forEach(r => {
        byStatus[r.status] = Number(r.count);
      });
    }

    const byType: Record<string, number> = {};
    if (typeCountsResult.data) {
      typeCountsResult.data.forEach(r => {
        byType[r.type] = Number(r.count);
      });
    }

    return successResponse({
      feedback: feedbackResult.data || [],
      stats: {
        byStatus,
        byType,
      }
    }, {
      pagination: {
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        total,
        hasMore: offset + limit < total,
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return internalErrorResponse('Failed to fetch feedback', error instanceof Error ? error : undefined);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication - Requirements 16.3
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error || 'Authentication required');
    }

    const body = await request.json();
    const { id, status, admin_response } = body;

    if (!id) {
      return badRequestResponse('Missing required field: id', ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // Get database adapter
    const db = getAdapter();

    // If updating status
    if (status) {
      const validStatuses = ['new', 'reviewed', 'resolved', 'archived'];
      if (!validStatuses.includes(status)) {
        return badRequestResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, ErrorCodes.INVALID_INPUT);
      }

      const result = await db.execute(
        `UPDATE feedback SET status = ?, updated_at = datetime('now') WHERE id = ?`,
        [status, id]
      );

      if (!result.success) {
        console.error('Error updating feedback status:', result.error);
        return internalErrorResponse('Failed to update feedback');
      }
    }

    // If adding admin response
    if (admin_response !== undefined) {
      const result = await db.execute(
        `UPDATE feedback SET admin_response = ?, responded_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
        [admin_response, id]
      );

      if (!result.success) {
        console.error('Error updating admin response:', result.error);
        return internalErrorResponse('Failed to update feedback');
      }
    }

    return successResponse({ id, status, admin_response }, { message: 'Feedback updated successfully' });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return internalErrorResponse('Failed to update feedback', error instanceof Error ? error : undefined);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication - Requirements 16.3
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error || 'Authentication required');
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return badRequestResponse('Missing required parameter: id', ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    // Get database adapter
    const db = getAdapter();

    const result = await db.execute(
      'DELETE FROM feedback WHERE id = ?',
      [parseInt(id)]
    );

    if (!result.success) {
      console.error('Error deleting feedback:', result.error);
      return internalErrorResponse('Failed to delete feedback');
    }

    return successResponse({ id: parseInt(id) }, { message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return internalErrorResponse('Failed to delete feedback', error instanceof Error ? error : undefined);
  }
}
