/**
 * Bot Detection Manual Review API
 * POST /api/admin/bot-detection/review - Submit manual review for bot detection
 * 
 * This endpoint handles the manual review workflow for bot detections,
 * allowing admin users to confirm or override automated bot classifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDB, getDB } from '@/lib/db/neon-connection';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';

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

// Initialize manual review tables
async function initializeReviewTables(adapter: any, isNeon: boolean) {
  const createManualReviewsTable = isNeon
    ? `CREATE TABLE IF NOT EXISTS manual_reviews (
        id SERIAL PRIMARY KEY,
        detection_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        decision TEXT NOT NULL CHECK (decision IN ('confirm_bot', 'confirm_human', 'needs_more_data')),
        confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
        notes TEXT,
        accuracy_improvement DECIMAL(3,2) DEFAULT 0.0,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
        updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      )`
    : `CREATE TABLE IF NOT EXISTS manual_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        detection_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        decision TEXT NOT NULL CHECK (decision IN ('confirm_bot', 'confirm_human', 'needs_more_data')),
        confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
        notes TEXT,
        accuracy_improvement REAL DEFAULT 0.0,
        created_at BIGINT DEFAULT (strftime('%s', 'now') * 1000),
        updated_at BIGINT DEFAULT (strftime('%s', 'now') * 1000)
      )`;

  await adapter.execute(createManualReviewsTable);

  // Create indexes for performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_manual_reviews_detection_id ON manual_reviews(detection_id)',
    'CREATE INDEX IF NOT EXISTS idx_manual_reviews_reviewer_id ON manual_reviews(reviewer_id)',
    'CREATE INDEX IF NOT EXISTS idx_manual_reviews_decision ON manual_reviews(decision)',
    'CREATE INDEX IF NOT EXISTS idx_manual_reviews_created ON manual_reviews(created_at)',
  ];

  for (const indexQuery of indexes) {
    try {
      await adapter.execute(indexQuery);
    } catch (e) {
      // Index might already exist
    }
  }
}

// Calculate accuracy improvement from manual review
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
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ManualReviewRequest = await request.json();

    // Validate required fields
    if (!body.detectionId || !body.decision || typeof body.confidence !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: detectionId, decision, confidence' },
        { status: 400 }
      );
    }

    // Validate confidence range
    if (body.confidence < 0 || body.confidence > 100) {
      return NextResponse.json(
        { error: 'Confidence must be between 0 and 100' },
        { status: 400 }
      );
    }

    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    const isNeon = db.isUsingNeon();

    // Initialize tables if they don't exist
    await initializeReviewTables(adapter, isNeon);

    // Get the original detection
    const getDetectionQuery = isNeon
      ? `SELECT * FROM bot_detections WHERE id = $1`
      : `SELECT * FROM bot_detections WHERE id = ?`;

    const detectionResult = await adapter.query(getDetectionQuery, [body.detectionId]);
    
    if (detectionResult.length === 0) {
      return NextResponse.json(
        { error: 'Detection not found' },
        { status: 404 }
      );
    }

    const detection = detectionResult[0];
    const originalStatus = detection.status;
    const originalConfidence = parseInt(detection.confidence_score) || 0;

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
        return NextResponse.json(
          { error: 'Invalid decision value' },
          { status: 400 }
        );
    }

    // Calculate accuracy improvement
    const accuracyImprovement = calculateAccuracyImprovement(
      originalConfidence,
      body.confidence,
      originalStatus,
      body.decision
    );

    const now = Date.now();
    const reviewerId = authResult.user?.id || 'unknown';

    // Update the bot detection record
    const updateDetectionQuery = isNeon
      ? `UPDATE bot_detections 
         SET status = $1, reviewed_by = $2, reviewed_at = $3, updated_at = $4
         WHERE id = $5`
      : `UPDATE bot_detections 
         SET status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`;

    await adapter.execute(updateDetectionQuery, [
      newStatus,
      reviewerId,
      now,
      now,
      body.detectionId,
    ]);

    // Insert the manual review record
    const insertReviewQuery = isNeon
      ? `INSERT INTO manual_reviews (detection_id, reviewer_id, decision, confidence, notes, accuracy_improvement, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`
      : `INSERT INTO manual_reviews (detection_id, reviewer_id, decision, confidence, notes, accuracy_improvement, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const insertParams = [
      body.detectionId,
      reviewerId,
      body.decision,
      body.confidence,
      body.notes || null,
      accuracyImprovement,
      now,
      now,
    ];

    await adapter.execute(insertReviewQuery, insertParams);

    // Prepare response
    const feedback: ReviewFeedback = {
      detectionId: body.detectionId,
      originalStatus,
      newStatus,
      accuracyImprovement,
      reviewedBy: reviewerId,
      reviewedAt: now,
    };

    return NextResponse.json({
      success: true,
      feedback,
      message: 'Manual review submitted successfully',
      timestamp: now,
    });

  } catch (error) {
    console.error('Manual review submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit manual review' },
      { status: 500 }
    );
  }
}

// GET - Retrieve manual review history and statistics
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    const isNeon = db.isUsingNeon();

    // Initialize tables if they don't exist
    await initializeReviewTables(adapter, isNeon);

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get review statistics
    const statsQuery = isNeon
      ? `SELECT 
           COUNT(*) as total_reviews,
           COUNT(CASE WHEN decision = 'confirm_bot' THEN 1 END) as confirmed_bots,
           COUNT(CASE WHEN decision = 'confirm_human' THEN 1 END) as confirmed_humans,
           COUNT(CASE WHEN decision = 'needs_more_data' THEN 1 END) as needs_more_data,
           AVG(confidence) as avg_reviewer_confidence,
           AVG(accuracy_improvement) as avg_accuracy_improvement
         FROM manual_reviews 
         WHERE created_at >= $1`
      : `SELECT 
           COUNT(*) as total_reviews,
           COUNT(CASE WHEN decision = 'confirm_bot' THEN 1 END) as confirmed_bots,
           COUNT(CASE WHEN decision = 'confirm_human' THEN 1 END) as confirmed_humans,
           COUNT(CASE WHEN decision = 'needs_more_data' THEN 1 END) as needs_more_data,
           AVG(confidence) as avg_reviewer_confidence,
           AVG(accuracy_improvement) as avg_accuracy_improvement
         FROM manual_reviews 
         WHERE created_at >= ?`;

    const statsResult = await adapter.query(statsQuery, [oneWeekAgo]);
    const stats = statsResult[0] || {
      total_reviews: 0,
      confirmed_bots: 0,
      confirmed_humans: 0,
      needs_more_data: 0,
      avg_reviewer_confidence: 0,
      avg_accuracy_improvement: 0,
    };

    // Get recent review history
    const historyQuery = isNeon
      ? `SELECT 
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
         WHERE mr.created_at >= $1
         ORDER BY mr.created_at DESC 
         LIMIT 50`
      : `SELECT 
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
         LIMIT 50`;

    const historyResult = await adapter.query(historyQuery, [oneWeekAgo]);

    const reviewHistory = historyResult.map((row: any) => ({
      detectionId: row.detection_id,
      reviewerId: row.reviewer_id,
      decision: row.decision,
      confidence: parseInt(row.confidence) || 0,
      notes: row.notes,
      accuracyImprovement: parseFloat(row.accuracy_improvement) || 0,
      reviewedAt: parseInt(row.created_at) || 0,
      detection: {
        userId: row.user_id,
        ipAddress: row.ip_address,
        originalConfidence: parseInt(row.original_confidence) || 0,
        currentStatus: row.current_status,
      },
    }));

    return NextResponse.json({
      success: true,
      statistics: {
        totalReviews: parseInt(stats.total_reviews) || 0,
        confirmedBots: parseInt(stats.confirmed_bots) || 0,
        confirmedHumans: parseInt(stats.confirmed_humans) || 0,
        needsMoreData: parseInt(stats.needs_more_data) || 0,
        avgReviewerConfidence: Math.round(parseFloat(stats.avg_reviewer_confidence) || 0),
        avgAccuracyImprovement: parseFloat(stats.avg_accuracy_improvement) || 0,
      },
      reviewHistory,
      timestamp: now,
    });

  } catch (error) {
    console.error('Manual review history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch review history' },
      { status: 500 }
    );
  }
}