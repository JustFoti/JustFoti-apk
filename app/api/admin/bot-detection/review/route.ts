/**
 * Bot Detection Manual Review API
 * POST /api/admin/bot-detection/review - Submit manual review for bot detection
 * GET /api/admin/bot-detection/review - Get review history and statistics
 * 
 * Migrated from Neon PostgreSQL to Cloudflare D1
 * 
 * This endpoint handles the manual review workflow for bot detections,
 * allowing admin users to confirm or override automated bot classifications.
 * 
 * Requirements: 13.6
 */

import { NextRequest } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getAdapter } from '@/app/lib/db/adapter';
import {
  successResponse,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  internalErrorResponse,
  ErrorCodes,
} from '@/app/lib/utils/api-response';

interface ManualReviewRequest {
  detectionId: string;
  decision: 'confirm_bot' | 'confirm_human' | 'needs_more_data';
  confidence: number; // 0-100, reviewer's confidence in their decision
  notes?: string;
}

interface ReviewFeedback {
  detectionId: string;
  originalStatus: string;
  newStatus: string;
  accuracyImprovement: number;
  reviewedBy: string;
  reviewedAt: number;
}

interface BotDetectionRow {
  id: number;
  user_id: string;
  ip_address: string;
  user_agent: string | null;
  confidence_score: number;
  detection_reasons: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface ManualReviewRow {
  id: number;
  detection_id: string;
  reviewer_id: string;
  decision: string;
  confidence: number;
  notes: string | null;
  accuracy_improvement: number;
  created_at: number;
  updated_at: number;
}

interface ReviewHistoryRow extends ManualReviewRow {
  user_id: string;
  ip_address: string;
  original_confidence: number;
  current_status: string;
}

interface ReviewStatsRow {
  total_reviews: number;
  confirmed_bots: number;
  confirmed_humans: number;
  needs_more_data: number;
  avg_reviewer_confidence: number | null;
  avg_accuracy_improvement: number | null;
}

/**
 * Calculate accuracy improvement from manual review
 */
function calculateAccuracyImprovement(
  originalConfidence: number,
  reviewConfidence: number,
  originalStatus: string,
  reviewDecision: string
): number {
  // Calculate how much this review should improve future detection accuracy
  const confidenceDifference = Math.abs(originalConfidence - reviewConfidence);
  const reviewerConfidence = reviewConfidence / 100;
  
  // Higher improvement for cases where:
  // 1. Reviewer is very confident
  // 2. There's a significant difference between detection and review
  // 3. The detection was in the uncertain range (30-70)
  
  let improvement = reviewerConfidence * 0.3; // Base improvement from reviewer confidence
  
  if (confidenceDifference > 30) {
    improvement += 0.4; // Significant disagreement provides more learning
  }
  
  if (originalConfidence >= 30 && originalConfidence <= 70) {
    improvement += 0.3; // Uncertain cases provide more learning value
  }
  
  // Additional improvement if the review corrects a misclassification
  const wasCorrectDetection = 
    (originalStatus === 'confirmed_bot' && reviewDecision === 'confirm_bot') ||
    (originalStatus === 'confirmed_human' && reviewDecision === 'confirm_human') ||
    (originalStatus === 'suspected' && reviewDecision === 'confirm_bot') ||
    (originalStatus === 'pending_review' && reviewDecision !== 'needs_more_data');

  if (!wasCorrectDetection) {
    improvement += 0.2; // Correction provides additional learning value
  }
  
  return Math.min(1.0, improvement);
}

// POST - Submit manual review for bot detection
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error || 'Authentication required');
    }

    const body: ManualReviewRequest = await request.json();

    // Validate required fields
    if (!body.detectionId || !body.decision || typeof body.confidence !== 'number') {
      return badRequestResponse(
        'Missing required fields: detectionId, decision, confidence',
        ErrorCodes.MISSING_REQUIRED_FIELD
      );
    }

    // Validate confidence range
    if (body.confidence < 0 || body.confidence > 100) {
      return badRequestResponse(
        'Confidence must be between 0 and 100',
        ErrorCodes.INVALID_INPUT
      );
    }

    // Validate decision value
    const validDecisions = ['confirm_bot', 'confirm_human', 'needs_more_data'];
    if (!validDecisions.includes(body.decision)) {
      return badRequestResponse(
        `Invalid decision. Must be one of: ${validDecisions.join(', ')}`,
        ErrorCodes.INVALID_INPUT
      );
    }

    // Get database adapter (uses D1 in Cloudflare environment)
    const db = getAdapter();

    // Get the original detection
    const detectionResult = await db.queryFirst<BotDetectionRow>(
      'SELECT * FROM bot_detections WHERE id = ?',
      [body.detectionId]
    );

    if (detectionResult.error) {
      console.error('Error fetching detection:', detectionResult.error);
      return internalErrorResponse('Failed to fetch detection');
    }

    if (!detectionResult.data) {
      return notFoundResponse('Detection not found');
    }

    const detection = detectionResult.data;
    const originalStatus = detection.status;
    const originalConfidence = Number(detection.confidence_score) || 0;

    // Determine new status based on review decision
    let newStatus: string;
    switch (body.decision) {
      case 'confirm_bot':
        newStatus = 'confirmed_bot';
        break;
      case 'confirm_human':
        newStatus = 'confirmed_human';
        break;
      case 'needs_more_data':
        newStatus = 'pending_review';
        break;
      default:
        return badRequestResponse('Invalid decision value', ErrorCodes.INVALID_INPUT);
    }

    // Calculate accuracy improvement
    const accuracyImprovement = calculateAccuracyImprovement(
      originalConfidence,
      body.confidence,
      originalStatus,
      body.decision
    );

    const now = Date.now();
    const reviewerId = authResult.user?.id?.toString() || 'unknown';

    // Update the bot detection record
    const updateResult = await db.execute(
      `UPDATE bot_detections 
       SET status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
      [newStatus, reviewerId, now, now, body.detectionId]
    );

    if (!updateResult.success) {
      console.error('Error updating detection:', updateResult.error);
      return internalErrorResponse('Failed to update detection');
    }

    // Insert the manual review record
    const insertResult = await db.execute(
      `INSERT INTO manual_reviews (detection_id, reviewer_id, decision, confidence, notes, accuracy_improvement, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.detectionId,
        reviewerId,
        body.decision,
        body.confidence,
        body.notes || null,
        accuracyImprovement,
        now,
        now,
      ]
    );

    if (!insertResult.success) {
      console.error('Error inserting review:', insertResult.error);
      return internalErrorResponse('Failed to store review');
    }

    // Prepare response
    const feedback: ReviewFeedback = {
      detectionId: body.detectionId,
      originalStatus,
      newStatus,
      accuracyImprovement,
      reviewedBy: reviewerId,
      reviewedAt: now,
    };

    return successResponse({
      feedback,
      timestamp: now,
    }, { message: 'Manual review submitted successfully' });
  } catch (error) {
    console.error('Manual review submission error:', error);
    return internalErrorResponse('Failed to submit manual review', error instanceof Error ? error : undefined);
  }
}

// GET - Retrieve manual review history and statistics
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error || 'Authentication required');
    }

    // Get database adapter (uses D1 in Cloudflare environment)
    const db = getAdapter();

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get review statistics
    const statsResult = await db.queryFirst<ReviewStatsRow>(
      `SELECT 
         COUNT(*) as total_reviews,
         COUNT(CASE WHEN decision = 'confirm_bot' THEN 1 END) as confirmed_bots,
         COUNT(CASE WHEN decision = 'confirm_human' THEN 1 END) as confirmed_humans,
         COUNT(CASE WHEN decision = 'needs_more_data' THEN 1 END) as needs_more_data,
         AVG(confidence) as avg_reviewer_confidence,
         AVG(accuracy_improvement) as avg_accuracy_improvement
       FROM manual_reviews 
       WHERE created_at >= ?`,
      [oneWeekAgo]
    );

    if (statsResult.error) {
      console.error('Error fetching review stats:', statsResult.error);
      return internalErrorResponse('Failed to fetch review statistics');
    }

    const stats = statsResult.data || {
      total_reviews: 0,
      confirmed_bots: 0,
      confirmed_humans: 0,
      needs_more_data: 0,
      avg_reviewer_confidence: 0,
      avg_accuracy_improvement: 0,
    };

    // Get recent review history
    const historyResult = await db.query<ReviewHistoryRow>(
      `SELECT 
         mr.detection_id,
         mr.reviewer_id,
         mr.decision,
         mr.confidence,
         mr.notes,
         mr.accuracy_improvement,
         mr.created_at,
         bd.user_id,
         bd.ip_address,
         bd.confidence_score as original_confidence,
         bd.status as current_status
       FROM manual_reviews mr
       JOIN bot_detections bd ON mr.detection_id = bd.id
       WHERE mr.created_at >= ?
       ORDER BY mr.created_at DESC 
       LIMIT 50`,
      [oneWeekAgo]
    );

    if (historyResult.error) {
      console.error('Error fetching review history:', historyResult.error);
      return internalErrorResponse('Failed to fetch review history');
    }

    const reviewHistory = (historyResult.data || []).map((row) => ({
      detectionId: row.detection_id,
      reviewerId: row.reviewer_id,
      decision: row.decision,
      confidence: Number(row.confidence) || 0,
      notes: row.notes,
      accuracyImprovement: Number(row.accuracy_improvement) || 0,
      reviewedAt: Number(row.created_at) || 0,
      detection: {
        userId: row.user_id,
        ipAddress: row.ip_address,
        originalConfidence: Number(row.original_confidence) || 0,
        currentStatus: row.current_status,
      },
    }));

    return successResponse({
      statistics: {
        totalReviews: Number(stats.total_reviews) || 0,
        confirmedBots: Number(stats.confirmed_bots) || 0,
        confirmedHumans: Number(stats.confirmed_humans) || 0,
        needsMoreData: Number(stats.needs_more_data) || 0,
        avgReviewerConfidence: Math.round(Number(stats.avg_reviewer_confidence) || 0),
        avgAccuracyImprovement: Number(stats.avg_accuracy_improvement) || 0,
      },
      reviewHistory,
      timestamp: now,
    });
  } catch (error) {
    console.error('Manual review history error:', error);
    return internalErrorResponse('Failed to fetch review history', error instanceof Error ? error : undefined);
  }
}
