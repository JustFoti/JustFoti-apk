/**
 * Bot Detection API - Scoring and Management System
 * GET /api/admin/bot-detection - Get bot detection metrics and recent detections
 * POST /api/admin/bot-detection - Analyze user activity for bot characteristics
 * 
 * Migrated from Neon PostgreSQL to Cloudflare D1
 * 
 * This endpoint provides bot detection scoring based on multiple criteria:
 * - Request frequency patterns
 * - User agent analysis
 * - Behavioral patterns (JavaScript, navigation speed, viewing patterns)
 * - IP analysis (datacenter IPs, VPN detection, geographic anomalies)
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
  internalErrorResponse,
  ErrorCodes,
} from '@/app/lib/utils/api-response';

// Bot detection criteria configuration
export const DETECTION_CRITERIA = {
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

export interface UserActivity {
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

export interface BotDetectionResult {
  userId: string;
  ipAddress: string;
  userAgent: string;
  confidenceScore: number; // 0-100
  detectionReasons: string[];
  status: 'suspected' | 'confirmed_bot' | 'confirmed_human' | 'pending_review';
  timestamp: number;
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

interface MetricsRow {
  total_detections: number;
  suspected_bots: number;
  confirmed_bots: number;
  pending_review: number;
  avg_confidence_score: number | null;
  max_confidence_score: number | null;
}

/**
 * Calculate bot detection score based on user activity
 * This function is exported for testing purposes
 */
export function calculateBotScore(activity: UserActivity): BotDetectionResult {
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
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error || 'Authentication required');
    }

    // Get database adapter (uses D1 in Cloudflare environment)
    const db = getAdapter();

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get bot detection metrics for the past week
    const metricsResult = await db.queryFirst<MetricsRow>(
      `SELECT 
         COUNT(*) as total_detections,
         COUNT(CASE WHEN status = 'suspected' THEN 1 END) as suspected_bots,
         COUNT(CASE WHEN status = 'confirmed_bot' THEN 1 END) as confirmed_bots,
         COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_review,
         AVG(confidence_score) as avg_confidence_score,
         MAX(confidence_score) as max_confidence_score
       FROM bot_detections 
       WHERE created_at >= ?`,
      [oneWeekAgo]
    );

    if (metricsResult.error) {
      console.error('Error fetching bot detection metrics:', metricsResult.error);
      return internalErrorResponse('Failed to fetch bot detection metrics');
    }

    const metrics = metricsResult.data || {
      total_detections: 0,
      suspected_bots: 0,
      confirmed_bots: 0,
      pending_review: 0,
      avg_confidence_score: 0,
      max_confidence_score: 0,
    };

    // Get recent detections from the past 24 hours
    const recentResult = await db.query<BotDetectionRow>(
      `SELECT id, user_id, ip_address, user_agent, confidence_score, detection_reasons, status, created_at
       FROM bot_detections 
       WHERE created_at >= ?
       ORDER BY created_at DESC 
       LIMIT 50`,
      [oneDayAgo]
    );

    if (recentResult.error) {
      console.error('Error fetching recent detections:', recentResult.error);
      return internalErrorResponse('Failed to fetch recent detections');
    }

    const recentDetections = (recentResult.data || []).map((row) => ({
      id: row.id.toString(),
      userId: row.user_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      confidenceScore: Number(row.confidence_score) || 0,
      detectionReasons: JSON.parse(row.detection_reasons || '[]'),
      status: row.status,
      createdAt: Number(row.created_at) || 0,
      updatedAt: Number(row.created_at) || 0,
    }));

    return successResponse({
      metrics: {
        totalDetections: Number(metrics.total_detections) || 0,
        suspectedBots: Number(metrics.suspected_bots) || 0,
        confirmedBots: Number(metrics.confirmed_bots) || 0,
        pendingReview: Number(metrics.pending_review) || 0,
        avgConfidenceScore: Math.round(Number(metrics.avg_confidence_score) || 0),
        maxConfidenceScore: Number(metrics.max_confidence_score) || 0,
      },
      recentDetections,
      detectionCriteria: DETECTION_CRITERIA,
      timestamp: now,
    });
  } catch (error) {
    console.error('Bot detection API error:', error);
    return internalErrorResponse('Failed to fetch bot detection data', error instanceof Error ? error : undefined);
  }
}

// POST - Analyze user activity for bot characteristics
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error || 'Authentication required');
    }

    const body = await request.json();
    const activity: UserActivity = body;

    // Validate required fields
    if (!activity.userId || !activity.ipAddress || !activity.userAgent) {
      return badRequestResponse(
        'Missing required fields: userId, ipAddress, userAgent',
        ErrorCodes.MISSING_REQUIRED_FIELD
      );
    }

    // Calculate bot detection score
    const result = calculateBotScore(activity);

    // Get database adapter (uses D1 in Cloudflare environment)
    const db = getAdapter();

    // Store the detection result
    const insertResult = await db.execute(
      `INSERT INTO bot_detections (user_id, ip_address, user_agent, confidence_score, detection_reasons, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.userId,
        result.ipAddress,
        result.userAgent,
        result.confidenceScore,
        JSON.stringify(result.detectionReasons),
        result.status,
        result.timestamp,
        result.timestamp,
      ]
    );

    if (!insertResult.success) {
      console.error('Error storing bot detection:', insertResult.error);
      return internalErrorResponse('Failed to store bot detection result');
    }

    // Get the inserted ID
    const detectionId = insertResult.lastRowId?.toString() || 'unknown';

    return successResponse({
      result: {
        ...result,
        id: detectionId,
      },
      timestamp: result.timestamp,
    }, { message: 'Bot detection analysis completed' });
  } catch (error) {
    console.error('Bot detection analysis error:', error);
    return internalErrorResponse('Failed to analyze user activity', error instanceof Error ? error : undefined);
  }
}
