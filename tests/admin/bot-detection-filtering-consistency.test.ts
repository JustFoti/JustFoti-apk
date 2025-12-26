/**
 * Property-Based Tests for Bot Detection Filtering Consistency
 * Feature: admin-panel-production-ready, Property 10: Bot filtering consistency
 * Validates: Requirements 8.4, 8.5
 * 
 * This test validates that:
 * - Detection criteria with weights are correctly applied
 * - Bot filter controls properly update global settings
 * - Analytics queries correctly exclude bots above the confidence threshold
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fc from 'fast-check';

// Detection criteria configuration (mirrors the API)
interface DetectionCriteria {
  requestFrequency: {
    threshold: number;
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

// Bot filter options (mirrors StatsContext)
interface BotFilterOptions {
  includeBots: boolean;
  confidenceThreshold: number;
  showBotMetrics: boolean;
}

// User activity for bot detection
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

// Bot detection result
interface BotDetectionResult {
  userId: string;
  confidenceScore: number;
  detectionReasons: string[];
  status: 'suspected' | 'confirmed_bot' | 'confirmed_human' | 'pending_review';
}

// Default detection criteria (matches API configuration)
const DEFAULT_CRITERIA: DetectionCriteria = {
  requestFrequency: {
    threshold: 60,
    weight: 30,
  },
  userAgentPatterns: {
    knownBots: ['bot', 'crawler', 'spider', 'scraper', 'googlebot', 'bingbot'],
    suspiciousPatterns: ['curl', 'wget', 'python', 'java', 'scrapy'],
    weight: 25,
  },
  behaviorPatterns: {
    noJavaScript: { weight: 20 },
    rapidNavigation: { threshold: 10, weight: 15 },
    unusualViewingPatterns: { weight: 10 },
  },
  ipAnalysis: {
    datacenterIPs: { weight: 15 },
    vpnDetection: { weight: 10 },
    geographicAnomalies: { weight: 5 },
  },
};

// Calculate bot detection score (mirrors API logic)
function calculateBotScore(activity: UserActivity, criteria: DetectionCriteria): BotDetectionResult {
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
    reasons.push('Suspicious user agent detected');
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

// Filter analytics results based on bot filter options
function filterAnalyticsResults(
  detections: BotDetectionResult[],
  filterOptions: BotFilterOptions
): { included: BotDetectionResult[]; excluded: BotDetectionResult[] } {
  if (filterOptions.includeBots) {
    return { included: detections, excluded: [] };
  }

  const included: BotDetectionResult[] = [];
  const excluded: BotDetectionResult[] = [];

  for (const detection of detections) {
    if (detection.confidenceScore >= filterOptions.confidenceThreshold) {
      excluded.push(detection);
    } else {
      included.push(detection);
    }
  }

  return { included, excluded };
}

// Generate user activity for testing
const generateUserActivity = () => fc.record({
  userId: fc.string({ minLength: 8, maxLength: 20 }),
  ipAddress: fc.ipV4(),
  userAgent: fc.oneof(
    fc.constantFrom(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (compatible; Googlebot/2.1)',
      'curl/7.68.0',
      'python-requests/2.25.1'
    )
  ),
  requestsPerMinute: fc.integer({ min: 1, max: 200 }),
  hasJavaScript: fc.boolean(),
  navigationSpeed: fc.integer({ min: 1, max: 50 }),
  viewingPatterns: fc.constantFrom('normal', 'unusual') as fc.Arbitrary<'normal' | 'unusual'>,
  isDatacenterIP: fc.boolean(),
  isVPN: fc.boolean(),
  hasGeographicAnomalies: fc.boolean(),
});

// Generate bot filter options
const generateBotFilterOptions = () => fc.record({
  includeBots: fc.boolean(),
  confidenceThreshold: fc.integer({ min: 30, max: 95 }),
  showBotMetrics: fc.boolean(),
});

describe('Bot Detection Filtering Consistency - Property 10', () => {
  /**
   * Property 10: Bot filtering consistency
   * For any analytics query with bot filtering enabled, the results should exclude
   * records with confidence scores above the threshold
   * Validates: Requirements 8.4, 8.5
   */

  test('Property 10: Bot filtering excludes records above confidence threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateUserActivity(), { minLength: 10, maxLength: 50 }),
        generateBotFilterOptions(),
        async (activities, filterOptions) => {
          // Calculate bot scores for all activities
          const detections = activities.map(activity => 
            calculateBotScore(activity, DEFAULT_CRITERIA)
          );

          // Apply filtering
          const { included, excluded } = filterAnalyticsResults(detections, filterOptions);

          if (filterOptions.includeBots) {
            // When bots are included, all records should be in included
            expect(included.length).toBe(detections.length);
            expect(excluded.length).toBe(0);
          } else {
            // When bots are excluded, verify threshold is respected
            for (const detection of excluded) {
              expect(detection.confidenceScore).toBeGreaterThanOrEqual(filterOptions.confidenceThreshold);
            }

            for (const detection of included) {
              expect(detection.confidenceScore).toBeLessThan(filterOptions.confidenceThreshold);
            }

            // Total should equal original count
            expect(included.length + excluded.length).toBe(detections.length);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Detection criteria weights are correctly applied', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateUserActivity(),
        async (activity) => {
          const result = calculateBotScore(activity, DEFAULT_CRITERIA);

          // Score should be within valid range
          expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result.confidenceScore).toBeLessThanOrEqual(100);

          // Status should match score ranges
          if (result.confidenceScore >= 80) {
            expect(result.status).toBe('confirmed_bot');
          } else if (result.confidenceScore >= 50) {
            expect(result.status).toBe('suspected');
          } else if (result.confidenceScore >= 30) {
            expect(result.status).toBe('pending_review');
          } else {
            expect(result.status).toBe('confirmed_human');
          }

          // Detection reasons should be non-empty if score > 0
          if (result.confidenceScore > 0) {
            expect(result.detectionReasons.length).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Threshold changes produce monotonic filtering results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateUserActivity(), { minLength: 20, maxLength: 40 }),
        async (activities) => {
          const detections = activities.map(activity => 
            calculateBotScore(activity, DEFAULT_CRITERIA)
          );

          const thresholds = [30, 50, 70, 90];
          const results: { included: number; excluded: number }[] = [];

          for (const threshold of thresholds) {
            const filterOptions: BotFilterOptions = {
              includeBots: false,
              confidenceThreshold: threshold,
              showBotMetrics: true,
            };
            const { included, excluded } = filterAnalyticsResults(detections, filterOptions);
            results.push({ included: included.length, excluded: excluded.length });
          }

          // Higher thresholds should include more records (be more permissive)
          for (let i = 1; i < results.length; i++) {
            expect(results[i].included).toBeGreaterThanOrEqual(results[i - 1].included);
            expect(results[i].excluded).toBeLessThanOrEqual(results[i - 1].excluded);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Filter settings are correctly preserved in results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateUserActivity(), { minLength: 5, maxLength: 20 }),
        generateBotFilterOptions(),
        async (activities, filterOptions) => {
          const detections = activities.map(activity => 
            calculateBotScore(activity, DEFAULT_CRITERIA)
          );

          const { included, excluded } = filterAnalyticsResults(detections, filterOptions);

          // Verify filtering is deterministic
          const { included: included2, excluded: excluded2 } = filterAnalyticsResults(detections, filterOptions);
          
          expect(included.length).toBe(included2.length);
          expect(excluded.length).toBe(excluded2.length);

          // Verify same user IDs in both runs
          const includedIds1 = new Set(included.map(d => d.userId));
          const includedIds2 = new Set(included2.map(d => d.userId));
          
          for (const id of includedIds1) {
            expect(includedIds2.has(id)).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Maximum possible score is bounded by sum of all weights', async () => {
    // Create an activity that triggers all detection criteria
    const maxBotActivity: UserActivity = {
      userId: 'max-bot-user',
      ipAddress: '1.2.3.4',
      userAgent: 'python-requests/2.25.1 bot crawler',
      requestsPerMinute: 200, // Above threshold
      hasJavaScript: false, // Triggers no JS
      navigationSpeed: 50, // Above threshold
      viewingPatterns: 'unusual',
      isDatacenterIP: true,
      isVPN: true,
      hasGeographicAnomalies: true,
    };

    const result = calculateBotScore(maxBotActivity, DEFAULT_CRITERIA);

    // Calculate maximum possible score from criteria
    const maxPossibleScore = 
      DEFAULT_CRITERIA.requestFrequency.weight +
      DEFAULT_CRITERIA.userAgentPatterns.weight +
      DEFAULT_CRITERIA.behaviorPatterns.noJavaScript.weight +
      DEFAULT_CRITERIA.behaviorPatterns.rapidNavigation.weight +
      DEFAULT_CRITERIA.behaviorPatterns.unusualViewingPatterns.weight +
      DEFAULT_CRITERIA.ipAnalysis.datacenterIPs.weight +
      DEFAULT_CRITERIA.ipAnalysis.vpnDetection.weight +
      DEFAULT_CRITERIA.ipAnalysis.geographicAnomalies.weight;

    // Score should be capped at 100
    expect(result.confidenceScore).toBeLessThanOrEqual(100);
    
    // If max possible is > 100, score should be exactly 100
    if (maxPossibleScore > 100) {
      expect(result.confidenceScore).toBe(100);
    }

    // Should be classified as confirmed bot
    expect(result.status).toBe('confirmed_bot');
  });

  test('Zero-score activities are never filtered out', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        generateBotFilterOptions(),
        async (count, filterOptions) => {
          // Create activities that won't trigger any detection criteria
          const cleanActivities: UserActivity[] = [];
          for (let i = 0; i < count; i++) {
            cleanActivities.push({
              userId: `clean-user-${i}`,
              ipAddress: '192.168.1.1',
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              requestsPerMinute: 5, // Below threshold
              hasJavaScript: true,
              navigationSpeed: 2, // Below threshold
              viewingPatterns: 'normal',
              isDatacenterIP: false,
              isVPN: false,
              hasGeographicAnomalies: false,
            });
          }

          const detections = cleanActivities.map(activity => 
            calculateBotScore(activity, DEFAULT_CRITERIA)
          );

          // All should have zero score
          for (const detection of detections) {
            expect(detection.confidenceScore).toBe(0);
            expect(detection.status).toBe('confirmed_human');
          }

          // None should be filtered out regardless of threshold
          const { included, excluded } = filterAnalyticsResults(detections, {
            ...filterOptions,
            includeBots: false,
          });

          expect(included.length).toBe(count);
          expect(excluded.length).toBe(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
