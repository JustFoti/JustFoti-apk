/**
 * Bot Detection API - Scoring and Management System
 * GET /api/admin/bot-detection - Get bot detection metrics and recent detections
 * POST /api/admin/bot-detection - Analyze user activity for bot characteristics
 * 
 * This endpoint provides bot detection scoring based on multiple criteria:
 * - Request frequency patterns
 * - User agent analysis
 * - Behavioral patterns (JavaScript, navigation speed, viewing patterns)
 * - IP analysis (datacenter IPs, VPN detection, geographic anomalies)
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDB, getDB } from '@/lib/db/neon-connection';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';

// Bot detection criteria configuration
const DETECTION_CRITERIA = {
  requestFrequency: {
    threshold: 60, // requests per minute
    weight: 30,
  },
  userAgentPatterns: {
    knownBots: ['bot', 'crawler', 'spider', 'scraper', 'googlebot', 'bingbot'],
    suspiciousPatterns: ['curl', 'wget', 'python', 'java', 'scrapy'],
    weight: 25,
  },
  behaviorPatterns: {
    noJavaScript: { weight: 20 },
    rapidNavigation: { threshold: 10, weight: 15 }, // 10 pages per minute
    unusualViewingPatterns: { weight: 10 },
  },
  ipAnalysis: {
    datacenterIPs: { weight: 15 },
    vpnDetection: { weight: 10 },
    geographicAnomalies: { weight: 5 },
  },
};

interface UserActivity {
  userId: string;
  ipAddress: string;
  userAgent: string;
  requestsPerMinute: number;
  hasJavaScript: boolean;
  navigationSpeed: number;
  viewingPatterns: 'normal' | 'unusual';
  isDatacenterIP: boolean;
  isVPN: boolean;
  hasGeographicAnomalies: boolean;
}

interface BotDetectionResult {
  userId: string;
  ipAddress: string;
  userAgent: string;
  confidenceScore: number; // 0-100
  detectionReasons: string[];
  status: 'suspected' | 'confirmed_bot' | 'confirmed_human' | 'pending_review';
  timestamp: number;
}

// Initialize bot detection tables
async function initializeBotDetectionTables(adapter: any, isNeon: boolean) {
  const createBotDetectionsTable = isNeon
    ? `CREATE TABLE IF NOT EXISTS bot_detections (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
        detection_reasons TEXT NOT NULL,
        status TEXT DEFAULT 'suspected' CHECK (status IN ('suspected', 'confirmed_bot', 'confirmed_human', 'pending_review')),
        reviewed_by TEXT,
        reviewed_at BIGINT,
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
        updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
      )`
    : `CREATE TABLE IF NOT EXISTS bot_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
        detection_reasons TEXT NOT NULL,
        status TEXT DEFAULT 'suspected' CHECK (status IN ('suspected', 'confirmed_bot', 'confirmed_human', 'pending_review')),
        reviewed_by TEXT,
        reviewed_at BIGINT,
        created_at BIGINT DEFAULT (strftime('%s', 'now') * 1000),
        updated_at BIGINT DEFAULT (strftime('%s', 'now') * 1000)
      )`;

  await adapter.execute(createBotDetectionsTable);

  // Create indexes for performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_bot_detections_user_id ON bot_detections(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_bot_detections_ip ON bot_detections(ip_address)',
    'CREATE INDEX IF NOT EXISTS idx_bot_detections_confidence ON bot_detections(confidence_score)',
    'CREATE INDEX IF NOT EXISTS idx_bot_detections_status ON bot_detections(status)',
    'CREATE INDEX IF NOT EXISTS idx_bot_detections_created ON bot_detections(created_at)',
  ];

  for (const indexQuery of indexes) {
    try {
      await adapter.execute(indexQuery);
    } catch (e) {
      // Index might already exist
    }
  }
}

// Calculate bot detection score
function calculateBotScore(activity: UserActivity): BotDetectionResult {
  let score = 0;
  const reasons: string[] = [];

  // Request frequency analysis
  if (activity.requestsPerMinute > DETECTION_CRITERIA.requestFrequency.threshold) {
    score += DETECTION_CRITERIA.requestFrequency.weight;
    reasons.push(`High request frequency: ${activity.requestsPerMinute}/min (threshold: ${DETECTION_CRITERIA.requestFrequency.threshold})`);
  }

  // User agent analysis
  const userAgentLower = activity.userAgent.toLowerCase();
  const hasKnownBot = DETECTION_CRITERIA.userAgentPatterns.knownBots.some(bot => userAgentLower.includes(bot));
  const hasSuspiciousPattern = DETECTION_CRITERIA.userAgentPatterns.suspiciousPatterns.some(pattern => userAgentLower.includes(pattern));
  
  if (hasKnownBot || hasSuspiciousPattern) {
    score += DETECTION_CRITERIA.userAgentPatterns.weight;
    reasons.push(`Suspicious user agent: ${activity.userAgent}`);
  }

  // Behavior pattern analysis
  if (!activity.hasJavaScript) {
    score += DETECTION_CRITERIA.behaviorPatterns.noJavaScript.weight;
    reasons.push('No JavaScript execution detected');
  }

  if (activity.navigationSpeed > DETECTION_CRITERIA.behaviorPatterns.rapidNavigation.threshold) {
    score += DETECTION_CRITERIA.behaviorPatterns.rapidNavigation.weight;
    reasons.push(`Rapid navigation: ${activity.navigationSpeed} pages/min (threshold: ${DETECTION_CRITERIA.behaviorPatterns.rapidNavigation.threshold})`);
  }

  if (activity.viewingPatterns === 'unusual') {
    score += DETECTION_CRITERIA.behaviorPatterns.unusualViewingPatterns.weight;
    reasons.push('Unusual viewing patterns detected');
  }

  // IP analysis
  if (activity.isDatacenterIP) {
    score += DETECTION_CRITERIA.ipAnalysis.datacenterIPs.weight;
    reasons.push('Datacenter IP address detected');
  }

  if (activity.isVPN) {
    score += DETECTION_CRITERIA.ipAnalysis.vpnDetection.weight;
    reasons.push('VPN usage detected');
  }

  if (activity.hasGeographicAnomalies) {
    score += DETECTION_CRITERIA.ipAnalysis.geographicAnomalies.weight;
    reasons.push('Geographic anomalies detected');
  }

  // Ensure score is within 0-100 range
  score = Math.min(100, Math.max(0, score));

  // Determine status based on score
  let status: BotDetectionResult['status'] = 'confirmed_human';
  if (score >= 80) {
    status = 'confirmed_bot';
  } else if (score >= 50) {
    status = 'suspected';
  } else if (score >= 30) {
    status = 'pending_review';
  }

  return {
    userId: activity.userId,
    ipAddress: activity.ipAddress,
    userAgent: activity.userAgent,
    confidenceScore: score,
    detectionReasons: reasons,
    status,
    timestamp: Date.now(),
  };
}

// GET - Retrieve bot detection metrics and recent detections
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
    await initializeBotDetectionTables(adapter, isNeon);

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get bot detection metrics
    const metricsQuery = isNeon
      ? `SELECT 
           COUNT(*) as total_detections,
           COUNT(CASE WHEN status = 'suspected' THEN 1 END) as suspected_bots,
           COUNT(CASE WHEN status = 'confirmed_bot' THEN 1 END) as confirmed_bots,
           COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_review,
           AVG(confidence_score) as avg_confidence_score,
           MAX(confidence_score) as max_confidence_score
         FROM bot_detections 
         WHERE created_at >= $1`
      : `SELECT 
           COUNT(*) as total_detections,
           COUNT(CASE WHEN status = 'suspected' THEN 1 END) as suspected_bots,
           COUNT(CASE WHEN status = 'confirmed_bot' THEN 1 END) as confirmed_bots,
           COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_review,
           AVG(confidence_score) as avg_confidence_score,
           MAX(confidence_score) as max_confidence_score
         FROM bot_detections 
         WHERE created_at >= ?`;

    const metricsResult = await adapter.query(metricsQuery, [oneWeekAgo]);
    const metrics = metricsResult[0] || {
      total_detections: 0,
      suspected_bots: 0,
      confirmed_bots: 0,
      pending_review: 0,
      avg_confidence_score: 0,
      max_confidence_score: 0,
    };

    // Get recent detections
    const recentQuery = isNeon
      ? `SELECT id, user_id, ip_address, user_agent, confidence_score, detection_reasons, status, created_at
         FROM bot_detections 
         WHERE created_at >= $1
         ORDER BY created_at DESC 
         LIMIT 50`
      : `SELECT id, user_id, ip_address, user_agent, confidence_score, detection_reasons, status, created_at
         FROM bot_detections 
         WHERE created_at >= ?
         ORDER BY created_at DESC 
         LIMIT 50`;

    const recentResult = await adapter.query(recentQuery, [oneDayAgo]);

    const recentDetections = recentResult.map((row: any) => ({
      id: row.id?.toString() || 'unknown',
      userId: row.user_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      confidenceScore: parseInt(row.confidence_score) || 0,
      detectionReasons: JSON.parse(row.detection_reasons || '[]'),
      status: row.status,
      createdAt: parseInt(row.created_at) || 0,
      updatedAt: parseInt(row.created_at) || 0,
    }));

    return NextResponse.json({
      success: true,
      metrics: {
        totalDetections: parseInt(metrics.total_detections) || 0,
        suspectedBots: parseInt(metrics.suspected_bots) || 0,
        confirmedBots: parseInt(metrics.confirmed_bots) || 0,
        pendingReview: parseInt(metrics.pending_review) || 0,
        avgConfidenceScore: Math.round(parseFloat(metrics.avg_confidence_score) || 0),
        maxConfidenceScore: parseInt(metrics.max_confidence_score) || 0,
      },
      recentDetections,
      detectionCriteria: DETECTION_CRITERIA,
      timestamp: now,
    });

  } catch (error) {
    console.error('Bot detection API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bot detection data' },
      { status: 500 }
    );
  }
}

// POST - Analyze user activity for bot characteristics
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const activity: UserActivity = body;

    // Validate required fields
    if (!activity.userId || !activity.ipAddress || !activity.userAgent) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, ipAddress, userAgent' },
        { status: 400 }
      );
    }

    // Calculate bot detection score
    const result = calculateBotScore(activity);

    await initializeDB();
    const db = getDB();
    const adapter = db.getAdapter();
    const isNeon = db.isUsingNeon();

    // Initialize tables if they don't exist
    await initializeBotDetectionTables(adapter, isNeon);

    // Store the detection result
    const insertQuery = isNeon
      ? `INSERT INTO bot_detections (user_id, ip_address, user_agent, confidence_score, detection_reasons, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`
      : `INSERT INTO bot_detections (user_id, ip_address, user_agent, confidence_score, detection_reasons, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const insertParams = [
      result.userId,
      result.ipAddress,
      result.userAgent,
      result.confidenceScore,
      JSON.stringify(result.detectionReasons),
      result.status,
      result.timestamp,
      result.timestamp,
    ];

    const insertResult = await adapter.execute(insertQuery, insertParams);
    
    // Get the inserted ID
    let detectionId: string;
    if (isNeon && insertResult.length > 0) {
      detectionId = insertResult[0].id.toString();
    } else {
      // For SQLite, get the last inserted row ID
      const lastIdQuery = 'SELECT last_insert_rowid() as id';
      const lastIdResult = await adapter.query(lastIdQuery);
      detectionId = lastIdResult[0]?.id?.toString() || 'unknown';
    }

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        id: detectionId,
      },
      timestamp: result.timestamp,
    });

  } catch (error) {
    console.error('Bot detection analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze user activity' },
      { status: 500 }
    );
  }
}