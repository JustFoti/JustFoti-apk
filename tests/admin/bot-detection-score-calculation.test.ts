/**
 * Property-Based Tests for Bot Detection Score Calculation
 * Feature: vercel-to-cloudflare-migration, Property 10: Bot Detection Score Calculation
 * 
 * Tests that the bot detection score calculation is consistent and correctly
 * applies the defined criteria weights after migration to D1.
 * 
 * **Validates: Requirements 13.6**
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';
import {
  calculateBotScore,
  DETECTION_CRITERIA,
  type UserActivity,
} from '../../app/api/admin/bot-detection/route';

describe('Bot Detection Score Calculation - D1 Migration', () => {
  /**
   * Property 10: Bot Detection Score Calculation
   * 
   * *For any* user activity data, the bot detection score SHALL be calculated
   * consistently based on the defined criteria weights, and the result SHALL
   * be stored and retrievable.
   * 
   * **Validates: Requirements 13.6**
   */
  test('Property 10: Bot detection score calculation is consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user activity data
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
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
            ),
            // Random user agents
            fc.string({ minLength: 10, maxLength: 100 })
          ),
          requestsPerMinute: fc.integer({ min: 0, max: 300 }),
          hasJavaScript: fc.boolean(),
          navigationSpeed: fc.integer({ min: 0, max: 100 }),
          viewingPatterns: fc.constantFrom('normal', 'unusual') as fc.Arbitrary<'normal' | 'unusual'>,
          isDatacenterIP: fc.boolean(),
          isVPN: fc.boolean(),
          hasGeographicAnomalies: fc.boolean(),
        }),
        async (activity: UserActivity) => {
          // Calculate score multiple times with same input
          const result1 = calculateBotScore(activity);
          const result2 = calculateBotScore(activity);

          // Property: Score calculation should be deterministic
          expect(result1.confidenceScore).toBe(result2.confidenceScore);
          expect(result1.status).toBe(result2.status);
          expect(result1.detectionReasons).toEqual(result2.detectionReasons);

          // Property: Score should be within valid bounds (0-100)
          expect(result1.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result1.confidenceScore).toBeLessThanOrEqual(100);

          // Property: Score should match the sum of triggered criteria weights
          let expectedScore = 0;

          // Request frequency
          if (activity.requestsPerMinute > DETECTION_CRITERIA.requestFrequency.threshold) {
            expectedScore += DETECTION_CRITERIA.requestFrequency.weight;
          }

          // User agent patterns
          const userAgentLower = activity.userAgent.toLowerCase();
          const hasKnownBot = DETECTION_CRITERIA.userAgentPatterns.knownBots.some(
            bot => userAgentLower.includes(bot)
          );
          const hasSuspiciousPattern = DETECTION_CRITERIA.userAgentPatterns.suspiciousPatterns.some(
            pattern => userAgentLower.includes(pattern)
          );
          if (hasKnownBot || hasSuspiciousPattern) {
            expectedScore += DETECTION_CRITERIA.userAgentPatterns.weight;
          }

          // Behavior patterns
          if (!activity.hasJavaScript) {
            expectedScore += DETECTION_CRITERIA.behaviorPatterns.noJavaScript.weight;
          }
          if (activity.navigationSpeed > DETECTION_CRITERIA.behaviorPatterns.rapidNavigation.threshold) {
            expectedScore += DETECTION_CRITERIA.behaviorPatterns.rapidNavigation.weight;
          }
          if (activity.viewingPatterns === 'unusual') {
            expectedScore += DETECTION_CRITERIA.behaviorPatterns.unusualViewingPatterns.weight;
          }

          // IP analysis
          if (activity.isDatacenterIP) {
            expectedScore += DETECTION_CRITERIA.ipAnalysis.datacenterIPs.weight;
          }
          if (activity.isVPN) {
            expectedScore += DETECTION_CRITERIA.ipAnalysis.vpnDetection.weight;
          }
          if (activity.hasGeographicAnomalies) {
            expectedScore += DETECTION_CRITERIA.ipAnalysis.geographicAnomalies.weight;
          }

          // Cap at 100
          expectedScore = Math.min(100, expectedScore);

          // Verify score matches expected calculation
          expect(result1.confidenceScore).toBe(expectedScore);

          // Property: Status should be consistent with score thresholds
          if (result1.confidenceScore >= 80) {
            expect(result1.status).toBe('confirmed_bot');
          } else if (result1.confidenceScore >= 50) {
            expect(result1.status).toBe('suspected');
          } else if (result1.confidenceScore >= 30) {
            expect(result1.status).toBe('pending_review');
          } else {
            expect(result1.status).toBe('confirmed_human');
          }

          // Property: Detection reasons should match triggered criteria
          if (result1.confidenceScore > 0) {
            expect(result1.detectionReasons.length).toBeGreaterThan(0);
          } else {
            expect(result1.detectionReasons.length).toBe(0);
          }

          // Property: Result should contain all required fields
          expect(result1.userId).toBe(activity.userId);
          expect(result1.ipAddress).toBe(activity.ipAddress);
          expect(result1.userAgent).toBe(activity.userAgent);
          expect(typeof result1.timestamp).toBe('number');
          expect(result1.timestamp).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property test: Weight accumulation is additive
   */
  test('Property 10.1: Weight accumulation is additive and capped at 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate activities with varying numbers of risk factors
        fc.record({
          userId: fc.constant('test-user'),
          ipAddress: fc.constant('192.168.1.1'),
          userAgent: fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
          requestsPerMinute: fc.integer({ min: 0, max: 300 }),
          hasJavaScript: fc.boolean(),
          navigationSpeed: fc.integer({ min: 0, max: 100 }),
          viewingPatterns: fc.constantFrom('normal', 'unusual') as fc.Arbitrary<'normal' | 'unusual'>,
          isDatacenterIP: fc.boolean(),
          isVPN: fc.boolean(),
          hasGeographicAnomalies: fc.boolean(),
        }),
        async (activity: UserActivity) => {
          const result = calculateBotScore(activity);

          // Count the number of triggered risk factors (excluding user agent since it's fixed)
          const triggeredFactors: number[] = [];

          if (activity.requestsPerMinute > DETECTION_CRITERIA.requestFrequency.threshold) {
            triggeredFactors.push(DETECTION_CRITERIA.requestFrequency.weight);
          }
          if (!activity.hasJavaScript) {
            triggeredFactors.push(DETECTION_CRITERIA.behaviorPatterns.noJavaScript.weight);
          }
          if (activity.navigationSpeed > DETECTION_CRITERIA.behaviorPatterns.rapidNavigation.threshold) {
            triggeredFactors.push(DETECTION_CRITERIA.behaviorPatterns.rapidNavigation.weight);
          }
          if (activity.viewingPatterns === 'unusual') {
            triggeredFactors.push(DETECTION_CRITERIA.behaviorPatterns.unusualViewingPatterns.weight);
          }
          if (activity.isDatacenterIP) {
            triggeredFactors.push(DETECTION_CRITERIA.ipAnalysis.datacenterIPs.weight);
          }
          if (activity.isVPN) {
            triggeredFactors.push(DETECTION_CRITERIA.ipAnalysis.vpnDetection.weight);
          }
          if (activity.hasGeographicAnomalies) {
            triggeredFactors.push(DETECTION_CRITERIA.ipAnalysis.geographicAnomalies.weight);
          }

          const sumOfWeights = triggeredFactors.reduce((sum, w) => sum + w, 0);
          const expectedScore = Math.min(100, sumOfWeights);

          // Property: Score should equal sum of weights (capped at 100)
          expect(result.confidenceScore).toBe(expectedScore);

          // Property: Number of reasons should match number of triggered factors
          expect(result.detectionReasons.length).toBe(triggeredFactors.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property test: Maximum possible score is 100
   */
  test('Property 10.2: Maximum score is capped at 100 even with all risk factors', async () => {
    // Create an activity with ALL risk factors triggered
    const maxRiskActivity: UserActivity = {
      userId: 'max-risk-user',
      ipAddress: '1.2.3.4',
      userAgent: 'curl/7.68.0', // Known bot pattern
      requestsPerMinute: 200, // Above threshold (60)
      hasJavaScript: false, // No JS
      navigationSpeed: 50, // Above threshold (10)
      viewingPatterns: 'unusual',
      isDatacenterIP: true,
      isVPN: true,
      hasGeographicAnomalies: true,
    };

    const result = calculateBotScore(maxRiskActivity);

    // Calculate theoretical maximum (sum of all weights)
    const theoreticalMax =
      DETECTION_CRITERIA.requestFrequency.weight +
      DETECTION_CRITERIA.userAgentPatterns.weight +
      DETECTION_CRITERIA.behaviorPatterns.noJavaScript.weight +
      DETECTION_CRITERIA.behaviorPatterns.rapidNavigation.weight +
      DETECTION_CRITERIA.behaviorPatterns.unusualViewingPatterns.weight +
      DETECTION_CRITERIA.ipAnalysis.datacenterIPs.weight +
      DETECTION_CRITERIA.ipAnalysis.vpnDetection.weight +
      DETECTION_CRITERIA.ipAnalysis.geographicAnomalies.weight;

    // Property: Score should be capped at 100 even if theoretical max exceeds it
    expect(result.confidenceScore).toBe(Math.min(100, theoreticalMax));
    expect(result.confidenceScore).toBeLessThanOrEqual(100);

    // Property: Status should be 'confirmed_bot' for max score
    expect(result.status).toBe('confirmed_bot');

    // Property: All risk factors should be in detection reasons
    expect(result.detectionReasons.length).toBe(8); // All 8 criteria triggered
  });
});
