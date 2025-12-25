/**
 * Property-Based Tests for Bot Detection Scoring System
 * Feature: admin-panel-unified-refactor, Property 27: Bot detection accuracy
 * Validates: Requirements 10.1
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import * as fc from 'fast-check';

// Bot detection criteria and scoring system
interface DetectionCriteria {
  requestFrequency: {
    threshold: number; // requests per minute
    weight: number;
  };
  userAgentPatterns: {
    knownBots: string[];
    suspiciousPatterns: string[];
    weight: number;
  };
  behaviorPatterns: {
    noJavaScript: { weight: number };
    rapidNavigation: { threshold: number; weight: number };
    unusualViewingPatterns: { weight: number };
  };
  ipAnalysis: {
    datacenterIPs: { weight: number };
    vpnDetection: { weight: number };
    geographicAnomalies: { weight: number };
  };
}

interface UserActivity {
  userId: string;
  ipAddress: string;
  userAgent: string;
  requestsPerMinute: number;
  hasJavaScript: boolean;
  navigationSpeed: number; // pages per minute
  viewingPatterns: 'normal' | 'unusual';
  isDatacenterIP: boolean;
  isVPN: boolean;
  hasGeographicAnomalies: boolean;
}

interface BotDetectionResult {
  userId: string;
  confidenceScore: number; // 0-100
  detectionReasons: string[];
  status: 'suspected' | 'confirmed_bot' | 'confirmed_human' | 'pending_review';
}

// Default detection criteria
const DEFAULT_CRITERIA: DetectionCriteria = {
  requestFrequency: {
    threshold: 60, // 60 requests per minute
    weight: 30,
  },
  userAgentPatterns: {
    knownBots: ['bot', 'crawler', 'spider', 'scraper'],
    suspiciousPatterns: ['curl', 'wget', 'python', 'java'],
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

// Bot detection scoring function
function calculateBotScore(activity: UserActivity, criteria: DetectionCriteria = DEFAULT_CRITERIA): BotDetectionResult {
  let score = 0;
  const reasons: string[] = [];

  // Request frequency analysis
  if (activity.requestsPerMinute > criteria.requestFrequency.threshold) {
    score += criteria.requestFrequency.weight;
    reasons.push(`High request frequency: ${activity.requestsPerMinute}/min`);
  }

  // User agent analysis
  const userAgentLower = activity.userAgent.toLowerCase();
  const hasKnownBot = criteria.userAgentPatterns.knownBots.some(bot => userAgentLower.includes(bot));
  const hasSuspiciousPattern = criteria.userAgentPatterns.suspiciousPatterns.some(pattern => userAgentLower.includes(pattern));
  
  if (hasKnownBot || hasSuspiciousPattern) {
    score += criteria.userAgentPatterns.weight;
    reasons.push(`Suspicious user agent: ${activity.userAgent}`);
  }

  // Behavior pattern analysis
  if (!activity.hasJavaScript) {
    score += criteria.behaviorPatterns.noJavaScript.weight;
    reasons.push('No JavaScript execution detected');
  }

  if (activity.navigationSpeed > criteria.behaviorPatterns.rapidNavigation.threshold) {
    score += criteria.behaviorPatterns.rapidNavigation.weight;
    reasons.push(`Rapid navigation: ${activity.navigationSpeed} pages/min`);
  }

  if (activity.viewingPatterns === 'unusual') {
    score += criteria.behaviorPatterns.unusualViewingPatterns.weight;
    reasons.push('Unusual viewing patterns detected');
  }

  // IP analysis
  if (activity.isDatacenterIP) {
    score += criteria.ipAnalysis.datacenterIPs.weight;
    reasons.push('Datacenter IP address detected');
  }

  if (activity.isVPN) {
    score += criteria.ipAnalysis.vpnDetection.weight;
    reasons.push('VPN usage detected');
  }

  if (activity.hasGeographicAnomalies) {
    score += criteria.ipAnalysis.geographicAnomalies.weight;
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
    confidenceScore: score,
    detectionReasons: reasons,
    status,
  };
}

describe('Bot Detection Scoring System', () => {
  test('Property 27: Bot detection accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user activities with known bot characteristics
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 20 }),
          ipAddress: fc.ipV4(),
          userAgent: fc.oneof(
            // Known bot user agents
            fc.constantFrom(
              'Mozilla/5.0 (compatible; Googlebot/2.1)',
              'curl/7.68.0',
              'python-requests/2.25.1',
              'Scrapy/2.5.0',
              'wget/1.20.3'
            ),
            // Suspicious patterns
            fc.constantFrom(
              'Mozilla/5.0 (compatible; bot)',
              'Java/1.8.0_291',
              'python-urllib/3.9',
              'crawler-agent/1.0'
            ),
            // Normal user agents
            fc.constantFrom(
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
            )
          ),
          requestsPerMinute: fc.integer({ min: 1, max: 200 }),
          hasJavaScript: fc.boolean(),
          navigationSpeed: fc.integer({ min: 1, max: 50 }),
          viewingPatterns: fc.constantFrom('normal', 'unusual'),
          isDatacenterIP: fc.boolean(),
          isVPN: fc.boolean(),
          hasGeographicAnomalies: fc.boolean(),
        }),
        async (activity) => {
          const result = calculateBotScore(activity);

          // Property: Bot detection should assign appropriate confidence scores
          // based on the presence of bot characteristics
          
          // Check score bounds
          expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result.confidenceScore).toBeLessThanOrEqual(100);

          // Check that high-risk activities get high scores
          const hasHighRiskCharacteristics = 
            activity.requestsPerMinute > DEFAULT_CRITERIA.requestFrequency.threshold ||
            activity.userAgent.toLowerCase().includes('bot') ||
            activity.userAgent.toLowerCase().includes('crawler') ||
            activity.userAgent.toLowerCase().includes('curl') ||
            activity.userAgent.toLowerCase().includes('python');

          if (hasHighRiskCharacteristics) {
            expect(result.confidenceScore).toBeGreaterThan(20);
          }

          // Check that multiple risk factors increase score
          const riskFactorCount = [
            activity.requestsPerMinute > DEFAULT_CRITERIA.requestFrequency.threshold,
            !activity.hasJavaScript,
            activity.navigationSpeed > DEFAULT_CRITERIA.behaviorPatterns.rapidNavigation.threshold,
            activity.viewingPatterns === 'unusual',
            activity.isDatacenterIP,
            activity.isVPN,
            activity.hasGeographicAnomalies,
          ].filter(Boolean).length;

          // Calculate expected minimum score based on actual weights
          let expectedMinScore = 0;
          if (activity.requestsPerMinute > DEFAULT_CRITERIA.requestFrequency.threshold) {
            expectedMinScore += DEFAULT_CRITERIA.requestFrequency.weight;
          }
          if (!activity.hasJavaScript) {
            expectedMinScore += DEFAULT_CRITERIA.behaviorPatterns.noJavaScript.weight;
          }
          if (activity.navigationSpeed > DEFAULT_CRITERIA.behaviorPatterns.rapidNavigation.threshold) {
            expectedMinScore += DEFAULT_CRITERIA.behaviorPatterns.rapidNavigation.weight;
          }
          if (activity.viewingPatterns === 'unusual') {
            expectedMinScore += DEFAULT_CRITERIA.behaviorPatterns.unusualViewingPatterns.weight;
          }
          if (activity.isDatacenterIP) {
            expectedMinScore += DEFAULT_CRITERIA.ipAnalysis.datacenterIPs.weight;
          }
          if (activity.isVPN) {
            expectedMinScore += DEFAULT_CRITERIA.ipAnalysis.vpnDetection.weight;
          }
          if (activity.hasGeographicAnomalies) {
            expectedMinScore += DEFAULT_CRITERIA.ipAnalysis.geographicAnomalies.weight;
          }

          // Property: Score should match the sum of triggered criteria weights (capped at 100)
          if (riskFactorCount >= 3) {
            const cappedExpectedScore = Math.min(100, expectedMinScore);
            expect(result.confidenceScore).toBeGreaterThanOrEqual(cappedExpectedScore);
          }

          // Check that detection reasons are provided when score > 0
          if (result.confidenceScore > 0) {
            expect(result.detectionReasons.length).toBeGreaterThan(0);
          }

          // Check status consistency with score
          if (result.confidenceScore >= 80) {
            expect(result.status).toBe('confirmed_bot');
          } else if (result.confidenceScore >= 50) {
            expect(result.status).toBe('suspected');
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Known bot patterns are detected with high confidence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 20 }),
          ipAddress: fc.ipV4(),
          // Generate activities with multiple bot characteristics
          requestsPerMinute: fc.integer({ min: 100, max: 200 }), // High request rate
          hasJavaScript: fc.constant(false), // No JS
          navigationSpeed: fc.integer({ min: 20, max: 50 }), // Rapid navigation
          viewingPatterns: fc.constant('unusual' as const),
          isDatacenterIP: fc.constant(true),
          isVPN: fc.boolean(),
          hasGeographicAnomalies: fc.boolean(),
        }),
        fc.constantFrom(
          'Mozilla/5.0 (compatible; Googlebot/2.1)',
          'curl/7.68.0',
          'python-requests/2.25.1',
          'Scrapy/2.5.0'
        ),
        async (activity, botUserAgent) => {
          const activityWithBotUA = { ...activity, userAgent: botUserAgent };
          const result = calculateBotScore(activityWithBotUA);

          // Property: Activities with multiple known bot characteristics
          // should receive high confidence scores (>= 70)
          expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
          expect(result.status).toBeOneOf(['suspected', 'confirmed_bot']);
          expect(result.detectionReasons.length).toBeGreaterThan(2);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Normal user activities receive low bot scores', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 20 }),
          ipAddress: fc.ipV4(),
          userAgent: fc.constantFrom(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          ),
          requestsPerMinute: fc.integer({ min: 1, max: 30 }), // Normal request rate
          hasJavaScript: fc.constant(true), // Has JS
          navigationSpeed: fc.integer({ min: 1, max: 5 }), // Normal navigation
          viewingPatterns: fc.constant('normal' as const),
          isDatacenterIP: fc.constant(false),
          isVPN: fc.constant(false),
          hasGeographicAnomalies: fc.constant(false),
        }),
        async (activity) => {
          const result = calculateBotScore(activity);

          // Property: Normal user activities should receive low bot scores (<= 30)
          expect(result.confidenceScore).toBeLessThanOrEqual(30);
          expect(result.status).toBeOneOf(['confirmed_human', 'pending_review']);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Score calculation is deterministic and consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 20 }),
          ipAddress: fc.ipV4(),
          userAgent: fc.string({ minLength: 10, maxLength: 100 }),
          requestsPerMinute: fc.integer({ min: 1, max: 200 }),
          hasJavaScript: fc.boolean(),
          navigationSpeed: fc.integer({ min: 1, max: 50 }),
          viewingPatterns: fc.constantFrom('normal', 'unusual'),
          isDatacenterIP: fc.boolean(),
          isVPN: fc.boolean(),
          hasGeographicAnomalies: fc.boolean(),
        }),
        async (activity) => {
          // Calculate score multiple times with same input
          const result1 = calculateBotScore(activity);
          const result2 = calculateBotScore(activity);
          const result3 = calculateBotScore(activity);

          // Property: Score calculation should be deterministic
          expect(result1.confidenceScore).toBe(result2.confidenceScore);
          expect(result2.confidenceScore).toBe(result3.confidenceScore);
          expect(result1.status).toBe(result2.status);
          expect(result1.detectionReasons).toEqual(result2.detectionReasons);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});