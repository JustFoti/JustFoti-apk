/**
 * Property-Based Tests for Bot Detection Criteria Transparency
 * Feature: admin-panel-unified-refactor, Property 29: Detection criteria transparency
 * Validates: Requirements 10.3
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Bot detection criteria and scoring system
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
  confidenceScore: number;
  detectionReasons: string[];
  status: 'suspected' | 'confirmed_bot' | 'confirmed_human' | 'pending_review';
  criteriaBreakdown: CriteriaBreakdown;
}

interface CriteriaBreakdown {
  requestFrequency: {
    triggered: boolean;
    value: number;
    threshold: number;
    weight: number;
    contribution: number;
  };
  userAgentPatterns: {
    triggered: boolean;
    matchedPatterns: string[];
    weight: number;
    contribution: number;
  };
  behaviorPatterns: {
    noJavaScript: {
      triggered: boolean;
      weight: number;
      contribution: number;
    };
    rapidNavigation: {
      triggered: boolean;
      value: number;
      threshold: number;
      weight: number;
      contribution: number;
    };
    unusualViewingPatterns: {
      triggered: boolean;
      weight: number;
      contribution: number;
    };
  };
  ipAnalysis: {
    datacenterIPs: {
      triggered: boolean;
      weight: number;
      contribution: number;
    };
    vpnDetection: {
      triggered: boolean;
      weight: number;
      contribution: number;
    };
    geographicAnomalies: {
      triggered: boolean;
      weight: number;
      contribution: number;
    };
  };
}

// Default detection criteria
const DEFAULT_CRITERIA: DetectionCriteria = {
  requestFrequency: {
    threshold: 60,
    weight: 30,
  },
  userAgentPatterns: {
    knownBots: ['bot', 'crawler', 'spider', 'scraper'],
    suspiciousPatterns: ['curl', 'wget', 'python', 'java'],
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

// Enhanced bot detection scoring function with transparency
function calculateBotScoreWithTransparency(
  activity: UserActivity, 
  criteria: DetectionCriteria = DEFAULT_CRITERIA
): BotDetectionResult {
  let score = 0;
  const reasons: string[] = [];
  
  // Initialize criteria breakdown
  const criteriaBreakdown: CriteriaBreakdown = {
    requestFrequency: {
      triggered: false,
      value: activity.requestsPerMinute,
      threshold: criteria.requestFrequency.threshold,
      weight: criteria.requestFrequency.weight,
      contribution: 0,
    },
    userAgentPatterns: {
      triggered: false,
      matchedPatterns: [],
      weight: criteria.userAgentPatterns.weight,
      contribution: 0,
    },
    behaviorPatterns: {
      noJavaScript: {
        triggered: false,
        weight: criteria.behaviorPatterns.noJavaScript.weight,
        contribution: 0,
      },
      rapidNavigation: {
        triggered: false,
        value: activity.navigationSpeed,
        threshold: criteria.behaviorPatterns.rapidNavigation.threshold,
        weight: criteria.behaviorPatterns.rapidNavigation.weight,
        contribution: 0,
      },
      unusualViewingPatterns: {
        triggered: false,
        weight: criteria.behaviorPatterns.unusualViewingPatterns.weight,
        contribution: 0,
      },
    },
    ipAnalysis: {
      datacenterIPs: {
        triggered: false,
        weight: criteria.ipAnalysis.datacenterIPs.weight,
        contribution: 0,
      },
      vpnDetection: {
        triggered: false,
        weight: criteria.ipAnalysis.vpnDetection.weight,
        contribution: 0,
      },
      geographicAnomalies: {
        triggered: false,
        weight: criteria.ipAnalysis.geographicAnomalies.weight,
        contribution: 0,
      },
    },
  };

  // Request frequency analysis
  if (activity.requestsPerMinute > criteria.requestFrequency.threshold) {
    score += criteria.requestFrequency.weight;
    criteriaBreakdown.requestFrequency.triggered = true;
    criteriaBreakdown.requestFrequency.contribution = criteria.requestFrequency.weight;
    reasons.push(`High request frequency: ${activity.requestsPerMinute}/min (threshold: ${criteria.requestFrequency.threshold})`);
  }

  // User agent analysis
  const userAgentLower = activity.userAgent.toLowerCase();
  const matchedBots = criteria.userAgentPatterns.knownBots.filter(bot => userAgentLower.includes(bot));
  const matchedSuspicious = criteria.userAgentPatterns.suspiciousPatterns.filter(pattern => userAgentLower.includes(pattern));
  const allMatched = [...matchedBots, ...matchedSuspicious];
  
  if (allMatched.length > 0) {
    score += criteria.userAgentPatterns.weight;
    criteriaBreakdown.userAgentPatterns.triggered = true;
    criteriaBreakdown.userAgentPatterns.matchedPatterns = allMatched;
    criteriaBreakdown.userAgentPatterns.contribution = criteria.userAgentPatterns.weight;
    reasons.push(`Suspicious user agent patterns: ${allMatched.join(', ')}`);
  }

  // Behavior pattern analysis
  if (!activity.hasJavaScript) {
    score += criteria.behaviorPatterns.noJavaScript.weight;
    criteriaBreakdown.behaviorPatterns.noJavaScript.triggered = true;
    criteriaBreakdown.behaviorPatterns.noJavaScript.contribution = criteria.behaviorPatterns.noJavaScript.weight;
    reasons.push('No JavaScript execution detected');
  }

  if (activity.navigationSpeed > criteria.behaviorPatterns.rapidNavigation.threshold) {
    score += criteria.behaviorPatterns.rapidNavigation.weight;
    criteriaBreakdown.behaviorPatterns.rapidNavigation.triggered = true;
    criteriaBreakdown.behaviorPatterns.rapidNavigation.contribution = criteria.behaviorPatterns.rapidNavigation.weight;
    reasons.push(`Rapid navigation: ${activity.navigationSpeed} pages/min (threshold: ${criteria.behaviorPatterns.rapidNavigation.threshold})`);
  }

  if (activity.viewingPatterns === 'unusual') {
    score += criteria.behaviorPatterns.unusualViewingPatterns.weight;
    criteriaBreakdown.behaviorPatterns.unusualViewingPatterns.triggered = true;
    criteriaBreakdown.behaviorPatterns.unusualViewingPatterns.contribution = criteria.behaviorPatterns.unusualViewingPatterns.weight;
    reasons.push('Unusual viewing patterns detected');
  }

  // IP analysis
  if (activity.isDatacenterIP) {
    score += criteria.ipAnalysis.datacenterIPs.weight;
    criteriaBreakdown.ipAnalysis.datacenterIPs.triggered = true;
    criteriaBreakdown.ipAnalysis.datacenterIPs.contribution = criteria.ipAnalysis.datacenterIPs.weight;
    reasons.push('Datacenter IP address detected');
  }

  if (activity.isVPN) {
    score += criteria.ipAnalysis.vpnDetection.weight;
    criteriaBreakdown.ipAnalysis.vpnDetection.triggered = true;
    criteriaBreakdown.ipAnalysis.vpnDetection.contribution = criteria.ipAnalysis.vpnDetection.weight;
    reasons.push('VPN usage detected');
  }

  if (activity.hasGeographicAnomalies) {
    score += criteria.ipAnalysis.geographicAnomalies.weight;
    criteriaBreakdown.ipAnalysis.geographicAnomalies.triggered = true;
    criteriaBreakdown.ipAnalysis.geographicAnomalies.contribution = criteria.ipAnalysis.geographicAnomalies.weight;
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
    criteriaBreakdown,
  };
}

describe('Bot Detection Criteria Transparency', () => {
  test('Property 29: Detection criteria transparency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 20 }),
          ipAddress: fc.ipV4(),
          userAgent: fc.oneof(
            fc.constantFrom(
              'Mozilla/5.0 (compatible; Googlebot/2.1)',
              'curl/7.68.0',
              'python-requests/2.25.1',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ),
            fc.string({ minLength: 10, maxLength: 100 })
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
          const result = calculateBotScoreWithTransparency(activity);

          // Property: For any bot detection result, the system should provide 
          // clear information about which detection criteria were triggered 
          // and their respective confidence contributions

          // 1. Criteria breakdown should always be present
          expect(result.criteriaBreakdown).toBeDefined();

          // 2. Each criteria category should have complete information
          expect(result.criteriaBreakdown.requestFrequency).toBeDefined();
          expect(result.criteriaBreakdown.userAgentPatterns).toBeDefined();
          expect(result.criteriaBreakdown.behaviorPatterns).toBeDefined();
          expect(result.criteriaBreakdown.ipAnalysis).toBeDefined();

          // 3. Triggered criteria should have positive contributions
          if (result.criteriaBreakdown.requestFrequency.triggered) {
            expect(result.criteriaBreakdown.requestFrequency.contribution).toBeGreaterThan(0);
            expect(result.criteriaBreakdown.requestFrequency.value).toBeGreaterThan(
              result.criteriaBreakdown.requestFrequency.threshold
            );
          } else {
            expect(result.criteriaBreakdown.requestFrequency.contribution).toBe(0);
          }

          if (result.criteriaBreakdown.userAgentPatterns.triggered) {
            expect(result.criteriaBreakdown.userAgentPatterns.contribution).toBeGreaterThan(0);
            expect(result.criteriaBreakdown.userAgentPatterns.matchedPatterns.length).toBeGreaterThan(0);
          } else {
            expect(result.criteriaBreakdown.userAgentPatterns.contribution).toBe(0);
            expect(result.criteriaBreakdown.userAgentPatterns.matchedPatterns.length).toBe(0);
          }

          // 4. Total score should equal sum of all contributions
          const totalContribution = 
            result.criteriaBreakdown.requestFrequency.contribution +
            result.criteriaBreakdown.userAgentPatterns.contribution +
            result.criteriaBreakdown.behaviorPatterns.noJavaScript.contribution +
            result.criteriaBreakdown.behaviorPatterns.rapidNavigation.contribution +
            result.criteriaBreakdown.behaviorPatterns.unusualViewingPatterns.contribution +
            result.criteriaBreakdown.ipAnalysis.datacenterIPs.contribution +
            result.criteriaBreakdown.ipAnalysis.vpnDetection.contribution +
            result.criteriaBreakdown.ipAnalysis.geographicAnomalies.contribution;

          expect(result.confidenceScore).toBe(Math.min(100, totalContribution));

          // 5. Detection reasons should correspond to triggered criteria
          const triggeredCriteriaCount = [
            result.criteriaBreakdown.requestFrequency.triggered,
            result.criteriaBreakdown.userAgentPatterns.triggered,
            result.criteriaBreakdown.behaviorPatterns.noJavaScript.triggered,
            result.criteriaBreakdown.behaviorPatterns.rapidNavigation.triggered,
            result.criteriaBreakdown.behaviorPatterns.unusualViewingPatterns.triggered,
            result.criteriaBreakdown.ipAnalysis.datacenterIPs.triggered,
            result.criteriaBreakdown.ipAnalysis.vpnDetection.triggered,
            result.criteriaBreakdown.ipAnalysis.geographicAnomalies.triggered,
          ].filter(Boolean).length;

          expect(result.detectionReasons.length).toBe(triggeredCriteriaCount);

          // 6. Each triggered criterion should have a corresponding reason
          if (result.criteriaBreakdown.requestFrequency.triggered) {
            expect(result.detectionReasons.some(reason => 
              reason.includes('request frequency')
            )).toBe(true);
          }

          if (result.criteriaBreakdown.userAgentPatterns.triggered) {
            expect(result.detectionReasons.some(reason => 
              reason.includes('user agent')
            )).toBe(true);
          }

          if (result.criteriaBreakdown.behaviorPatterns.noJavaScript.triggered) {
            expect(result.detectionReasons.some(reason => 
              reason.includes('JavaScript')
            )).toBe(true);
          }

          // 7. Weights and thresholds should be transparent
          expect(result.criteriaBreakdown.requestFrequency.weight).toBe(DEFAULT_CRITERIA.requestFrequency.weight);
          expect(result.criteriaBreakdown.requestFrequency.threshold).toBe(DEFAULT_CRITERIA.requestFrequency.threshold);
          expect(result.criteriaBreakdown.behaviorPatterns.rapidNavigation.threshold).toBe(
            DEFAULT_CRITERIA.behaviorPatterns.rapidNavigation.threshold
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Criteria breakdown provides complete transparency for high-confidence detections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 20 }),
          ipAddress: fc.ipV4(),
          userAgent: fc.constantFrom('curl/7.68.0', 'python-requests/2.25.1', 'Scrapy/2.5.0'),
          requestsPerMinute: fc.integer({ min: 100, max: 200 }), // High request rate
          hasJavaScript: fc.constant(false), // No JS
          navigationSpeed: fc.integer({ min: 20, max: 50 }), // Rapid navigation
          viewingPatterns: fc.constant('unusual' as const),
          isDatacenterIP: fc.constant(true),
          isVPN: fc.boolean(),
          hasGeographicAnomalies: fc.boolean(),
        }),
        async (activity) => {
          const result = calculateBotScoreWithTransparency(activity);

          // Property: High-confidence bot detections should have detailed 
          // transparency showing all triggered criteria
          expect(result.confidenceScore).toBeGreaterThan(70);

          // Should have multiple triggered criteria
          const triggeredCount = [
            result.criteriaBreakdown.requestFrequency.triggered,
            result.criteriaBreakdown.userAgentPatterns.triggered,
            result.criteriaBreakdown.behaviorPatterns.noJavaScript.triggered,
            result.criteriaBreakdown.behaviorPatterns.rapidNavigation.triggered,
            result.criteriaBreakdown.behaviorPatterns.unusualViewingPatterns.triggered,
            result.criteriaBreakdown.ipAnalysis.datacenterIPs.triggered,
          ].filter(Boolean).length;

          expect(triggeredCount).toBeGreaterThanOrEqual(4);

          // Each triggered criterion should have detailed information
          if (result.criteriaBreakdown.userAgentPatterns.triggered) {
            expect(result.criteriaBreakdown.userAgentPatterns.matchedPatterns.length).toBeGreaterThan(0);
            expect(result.criteriaBreakdown.userAgentPatterns.matchedPatterns.some(pattern => 
              /curl|python|scrapy/i.test(pattern)
            )).toBe(true);
          }

          // Contributions should sum correctly
          const totalContribution = Object.values(result.criteriaBreakdown).reduce((sum, category) => {
            if (typeof category === 'object' && 'contribution' in category) {
              return sum + category.contribution;
            } else if (typeof category === 'object') {
              return sum + Object.values(category).reduce((subSum, subCategory) => {
                if (typeof subCategory === 'object' && 'contribution' in subCategory) {
                  return subSum + subCategory.contribution;
                }
                return subSum;
              }, 0);
            }
            return sum;
          }, 0);

          expect(result.confidenceScore).toBe(Math.min(100, totalContribution));

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Low-risk activities have transparent zero contributions', async () => {
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
          const result = calculateBotScoreWithTransparency(activity);

          // Property: Low-risk activities should have transparent zero contributions
          // for all criteria that weren't triggered
          expect(result.confidenceScore).toBeLessThanOrEqual(30);

          // Most criteria should not be triggered
          expect(result.criteriaBreakdown.requestFrequency.triggered).toBe(false);
          expect(result.criteriaBreakdown.requestFrequency.contribution).toBe(0);

          expect(result.criteriaBreakdown.userAgentPatterns.triggered).toBe(false);
          expect(result.criteriaBreakdown.userAgentPatterns.contribution).toBe(0);
          expect(result.criteriaBreakdown.userAgentPatterns.matchedPatterns.length).toBe(0);

          expect(result.criteriaBreakdown.behaviorPatterns.noJavaScript.triggered).toBe(false);
          expect(result.criteriaBreakdown.behaviorPatterns.noJavaScript.contribution).toBe(0);

          expect(result.criteriaBreakdown.behaviorPatterns.rapidNavigation.triggered).toBe(false);
          expect(result.criteriaBreakdown.behaviorPatterns.rapidNavigation.contribution).toBe(0);

          expect(result.criteriaBreakdown.behaviorPatterns.unusualViewingPatterns.triggered).toBe(false);
          expect(result.criteriaBreakdown.behaviorPatterns.unusualViewingPatterns.contribution).toBe(0);

          // IP analysis should all be false
          expect(result.criteriaBreakdown.ipAnalysis.datacenterIPs.triggered).toBe(false);
          expect(result.criteriaBreakdown.ipAnalysis.datacenterIPs.contribution).toBe(0);

          expect(result.criteriaBreakdown.ipAnalysis.vpnDetection.triggered).toBe(false);
          expect(result.criteriaBreakdown.ipAnalysis.vpnDetection.contribution).toBe(0);

          expect(result.criteriaBreakdown.ipAnalysis.geographicAnomalies.triggered).toBe(false);
          expect(result.criteriaBreakdown.ipAnalysis.geographicAnomalies.contribution).toBe(0);

          // Should have no detection reasons
          expect(result.detectionReasons.length).toBe(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});