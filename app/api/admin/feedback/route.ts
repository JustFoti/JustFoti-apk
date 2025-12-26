/**
 * Admin Feedback API
 * GET /api/admin/feedback - Get feedback items with filtering and pagination
 * PATCH /api/admin/feedback - Update feedback status
 * DELETE /api/admin/feedback - Delete feedback item
 * 
 * Implements standardized response format per Requirements 16.2, 16.4, 16.5
 */

import { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import {
  successResponse,
  unauthorizedResponse,
  badRequestResponse,
  internalErrorResponse,
  ErrorCodes,
} from '@/app/lib/utils/api-response';

const sql = neon(process.env.DATABASE_URL || '');

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

  try {
    // Build query conditions
    let conditions = [];
    if (status !== 'all') {
      conditions.push(`status = '${status}'`);
    }
    if (type !== 'all') {
      conditions.push(`type = '${type}'`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get feedback with pagination
    const feedback = await sql`
      SELECT * FROM feedback
      ${sql.unsafe(whereClause)}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total FROM feedback
      ${sql.unsafe(whereClause)}
    `;
    
    // Get counts by status
    const statusCounts = await sql`
      SELECT status, COUNT(*) as count FROM feedback GROUP BY status
    `;
    
    // Get counts by type
    const typeCounts = await sql`
      SELECT type, COUNT(*) as count FROM feedback GROUP BY type
    `;

    return successResponse({
      feedback,
      stats: {
        byStatus: Object.fromEntries(statusCounts.map(r => [r.status, parseInt(r.count)])),
        byType: Object.fromEntries(typeCounts.map(r => [r.type, parseInt(r.count)])),
      }
    }, {
      pagination: {
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        total: parseInt(countResult[0]?.total || '0'),
        hasMore: offset + limit < parseInt(countResult[0]?.total || '0'),
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
    const { id, status } = body;

    if (!id || !status) {
      return badRequestResponse('Missing required fields: id and status', ErrorCodes.MISSING_REQUIRED_FIELD);
    }

    const validStatuses = ['new', 'reviewed', 'resolved', 'archived'];
    if (!validStatuses.includes(status)) {
      return badRequestResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, ErrorCodes.INVALID_INPUT);
    }

    await sql`
      UPDATE feedback 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
    `;

    return successResponse({ id, status }, { message: 'Feedback status updated successfully' });
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

    await sql`DELETE FROM feedback WHERE id = ${parseInt(id)}`;
    
    return successResponse({ id: parseInt(id) }, { message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return internalErrorResponse('Failed to delete feedback', error instanceof Error ? error : undefined);
  }
}
