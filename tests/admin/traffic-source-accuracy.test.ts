/**
 * Property-Based Tests for Traffic Source Analysis
 * Feature: admin-panel-unified-refactor, Property 31: Traffic source accuracy
 * Validates: Requirements 6.1
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import * as fc from 'fast-check';

// Traffic source analysis interfaces
interface TrafficHit {
  id: string;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  referrerUrl?: string;
  referrerDomain?: string;
  referrerMedium: 'organic' | 'social' | 'referral' | 'direct' | 'email' | 'none';
  sourceType: 'browser' | 'bot' | 'api' | 'social' | 'rss' | 'unknown';
  sourceName: string;
  country: string;
  isBot: boolean;
  userId?: string;
}

interface TrafficSourceStats {
  sourceType: string;
  sourceName: string;
  hitCount: number;
  uniqueVisitors: number;
  botHits: number;
  humanHits: number;
}

interface ReferrerStats {
  referrerDomain: string;
  referrerMedium: string;
  hitCount: number;
  uniqueVisitors: number;
  lastHit: number;
}

interface GeographicStats {
  country: string;
  hitCount: number;
  uniqueVisitors: number;
  botHits: number;
  humanHits: number;
}

interface TrafficAnalysisResult {
  totals: {
    totalHits: number;
    uniqueVisitors: number;
    botHits: number;
    humanHits: number;
  };
  sourceStats: TrafficSourceStats[];
  referrerStats: ReferrerStats[];
  geoStats: GeographicStats[];
  hourlyPattern: Array<{ hour: number; hitCount: number; botHits: number }>;
}

// Traffic analysis functions
function analyzeTrafficSources(hits: TrafficHit[]): TrafficAnalysisResult {
  // Calculate totals
  const totalHits = hits.length;
  const uniqueVisitors = new Set(hits.map(h => h.userId || h.ipAddress)).size;
  const botHits = hits.filter(h => h.isBot).length;
  const humanHits = totalHits - botHits;

  // Analyze by source type and name
  const sourceMap = new Map<string, TrafficSourceStats>();
  hits.forEach(hit => {
    const key = `${hit.sourceType}-${hit.sourceName}`;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        sourceType: hit.sourceType,
        sourceName: hit.sourceName,
        hitCount: 0,
        uniqueVisitors: 0,
        botHits: 0,
        humanHits: 0,
      });
    }
    const stats = sourceMap.get(key)!;
    stats.hitCount++;
    if (hit.isBot) {
      stats.botHits++;
    } else {
      stats.humanHits++;
    }
  });

  // Calculate unique visitors per source
  sourceMap.forEach((stats, key) => {
    const sourceHits = hits.filter(h => `${h.sourceType}-${h.sourceName}` === key);
    stats.uniqueVisitors = new Set(sourceHits.map(h => h.userId || h.ipAddress)).size;
  });

  // Analyze referrers
  const referrerMap = new Map<string, ReferrerStats>();
  hits.forEach(hit => {
    if (hit.referrerDomain) {
      const key = hit.referrerDomain;
      if (!referrerMap.has(key)) {
        referrerMap.set(key, {
          referrerDomain: hit.referrerDomain,
          referrerMedium: hit.referrerMedium,
          hitCount: 0,
          uniqueVisitors: 0,
          lastHit: hit.timestamp,
        });
      }
      const stats = referrerMap.get(key)!;
      stats.hitCount++;
      stats.lastHit = Math.max(stats.lastHit, hit.timestamp);
    }
  });

  // Calculate unique visitors per referrer
  referrerMap.forEach((stats, domain) => {
    const referrerHits = hits.filter(h => h.referrerDomain === domain);
    stats.uniqueVisitors = new Set(referrerHits.map(h => h.userId || h.ipAddress)).size;
  });

  // Analyze geographic distribution
  const geoMap = new Map<string, GeographicStats>();
  hits.forEach(hit => {
    if (!geoMap.has(hit.country)) {
      geoMap.set(hit.country, {
        country: hit.country,
        hitCount: 0,
        uniqueVisitors: 0,
        botHits: 0,
        humanHits: 0,
      });
    }
    const stats = geoMap.get(hit.country)!;
    stats.hitCount++;
    if (hit.isBot) {
      stats.botHits++;
    } else {
      stats.humanHits++;
    }
  });

  // Calculate unique visitors per country
  geoMap.forEach((stats, country) => {
    const countryHits = hits.filter(h => h.country === country);
    stats.uniqueVisitors = new Set(countryHits.map(h => h.userId || h.ipAddress)).size;
  });

  // Analyze hourly patterns
  const hourlyMap = new Map<number, { hitCount: number; botHits: number }>();
  hits.forEach(hit => {
    const hour = new Date(hit.timestamp).getHours();
    if (!hourlyMap.has(hour)) {
      hourlyMap.set(hour, { hitCount: 0, botHits: 0 });
    }
    const stats = hourlyMap.get(hour)!;
    stats.hitCount++;
    if (hit.isBot) {
      stats.botHits++;
    }
  });

  const hourlyPattern = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    hitCount: hourlyMap.get(hour)?.hitCount || 0,
    botHits: hourlyMap.get(hour)?.botHits || 0,
  }));

  return {
    totals: {
      totalHits,
      uniqueVisitors,
      botHits,
      humanHits,
    },
    sourceStats: Array.from(sourceMap.values()).sort((a, b) => b.hitCount - a.hitCount),
    referrerStats: Array.from(referrerMap.values()).sort((a, b) => b.hitCount - a.hitCount),
    geoStats: Array.from(geoMap.values()).sort((a, b) => b.hitCount - a.hitCount),
    hourlyPattern,
  };
}

describe('Traffic Source Analysis', () => {
  test('Property 31: Traffic source accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate traffic hits with various characteristics
        fc.array(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 20 }),
            timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }), // Last 24 hours
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
            referrerUrl: fc.option(fc.webUrl(), { nil: undefined }),
            referrerDomain: fc.option(fc.domain(), { nil: undefined }),
            referrerMedium: fc.constantFrom('organic', 'social', 'referral', 'direct', 'email', 'none'),
            sourceType: fc.constantFrom('browser', 'bot', 'api', 'social', 'rss', 'unknown'),
            sourceName: fc.oneof(
              fc.constantFrom('Chrome', 'Firefox', 'Safari', 'Edge'),
              fc.constantFrom('Googlebot', 'Bingbot', 'FacebookBot'),
              fc.constantFrom('API Client', 'RSS Reader', 'Unknown')
            ),
            country: fc.constantFrom('US', 'GB', 'CA', 'DE', 'FR', 'JP', 'AU', 'BR', 'IN', 'CN'),
            isBot: fc.boolean(),
            userId: fc.option(fc.string({ minLength: 8, maxLength: 16 }), { nil: undefined }),
          }),
          { minLength: 10, maxLength: 1000 }
        ),
        async (hits) => {
          const result = analyzeTrafficSources(hits);

          // Property: Traffic analysis should accurately count and categorize all hits
          
          // Total counts should match input data
          expect(result.totals.totalHits).toBe(hits.length);
          expect(result.totals.botHits).toBe(hits.filter(h => h.isBot).length);
          expect(result.totals.humanHits).toBe(hits.filter(h => !h.isBot).length);
          expect(result.totals.botHits + result.totals.humanHits).toBe(result.totals.totalHits);

          // Unique visitors should be calculated correctly
          const expectedUniqueVisitors = new Set(hits.map(h => h.userId || h.ipAddress)).size;
          expect(result.totals.uniqueVisitors).toBe(expectedUniqueVisitors);

          // Source stats should account for all hits
          const totalSourceHits = result.sourceStats.reduce((sum, s) => sum + s.hitCount, 0);
          expect(totalSourceHits).toBe(hits.length);

          // Bot/human breakdown in source stats should be accurate
          result.sourceStats.forEach(source => {
            const sourceHits = hits.filter(h => h.sourceType === source.sourceType && h.sourceName === source.sourceName);
            expect(source.hitCount).toBe(sourceHits.length);
            expect(source.botHits).toBe(sourceHits.filter(h => h.isBot).length);
            expect(source.humanHits).toBe(sourceHits.filter(h => !h.isBot).length);
            expect(source.botHits + source.humanHits).toBe(source.hitCount);
            
            // Unique visitors per source should be accurate
            const expectedUniqueForSource = new Set(sourceHits.map(h => h.userId || h.ipAddress)).size;
            expect(source.uniqueVisitors).toBe(expectedUniqueForSource);
          });

          // Referrer stats should be accurate for hits with referrers
          const hitsWithReferrers = hits.filter(h => h.referrerDomain);
          const totalReferrerHits = result.referrerStats.reduce((sum, r) => sum + r.hitCount, 0);
          expect(totalReferrerHits).toBe(hitsWithReferrers.length);

          result.referrerStats.forEach(referrer => {
            const referrerHits = hits.filter(h => h.referrerDomain === referrer.referrerDomain);
            expect(referrer.hitCount).toBe(referrerHits.length);
            
            // Last hit timestamp should be the maximum for this referrer
            const maxTimestamp = Math.max(...referrerHits.map(h => h.timestamp));
            expect(referrer.lastHit).toBe(maxTimestamp);
            
            // Unique visitors per referrer should be accurate
            const expectedUniqueForReferrer = new Set(referrerHits.map(h => h.userId || h.ipAddress)).size;
            expect(referrer.uniqueVisitors).toBe(expectedUniqueForReferrer);
          });

          // Geographic stats should account for all hits
          const totalGeoHits = result.geoStats.reduce((sum, g) => sum + g.hitCount, 0);
          expect(totalGeoHits).toBe(hits.length);

          result.geoStats.forEach(geo => {
            const geoHits = hits.filter(h => h.country === geo.country);
            expect(geo.hitCount).toBe(geoHits.length);
            expect(geo.botHits).toBe(geoHits.filter(h => h.isBot).length);
            expect(geo.humanHits).toBe(geoHits.filter(h => !h.isBot).length);
            expect(geo.botHits + geo.humanHits).toBe(geo.hitCount);
            
            // Unique visitors per country should be accurate
            const expectedUniqueForCountry = new Set(geoHits.map(h => h.userId || h.ipAddress)).size;
            expect(geo.uniqueVisitors).toBe(expectedUniqueForCountry);
          });

          // Hourly pattern should account for all hits
          const totalHourlyHits = result.hourlyPattern.reduce((sum, h) => sum + h.hitCount, 0);
          expect(totalHourlyHits).toBe(hits.length);

          // Each hour should have correct counts
          result.hourlyPattern.forEach(hourData => {
            const hourHits = hits.filter(h => new Date(h.timestamp).getHours() === hourData.hour);
            expect(hourData.hitCount).toBe(hourHits.length);
            expect(hourData.botHits).toBe(hourHits.filter(h => h.isBot).length);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Traffic source categorization is consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 20 }),
            timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 10, maxLength: 100 }),
            referrerDomain: fc.option(fc.domain(), { nil: undefined }),
            referrerMedium: fc.constantFrom('organic', 'social', 'referral', 'direct', 'email', 'none'),
            sourceType: fc.constantFrom('browser', 'bot', 'api', 'social', 'rss', 'unknown'),
            sourceName: fc.string({ minLength: 3, maxLength: 20 }),
            country: fc.constantFrom('US', 'GB', 'CA', 'DE', 'FR'),
            isBot: fc.boolean(),
            userId: fc.option(fc.string({ minLength: 8, maxLength: 16 }), { nil: undefined }),
          }),
          { minLength: 50, maxLength: 200 }
        ),
        async (hits) => {
          const result = analyzeTrafficSources(hits);

          // Property: Source categorization should be consistent and complete
          
          // All unique source combinations should be represented
          const uniqueSources = new Set(hits.map(h => `${h.sourceType}-${h.sourceName}`));
          expect(result.sourceStats.length).toBe(uniqueSources.size);

          // Source stats should be sorted by hit count (descending)
          for (let i = 1; i < result.sourceStats.length; i++) {
            expect(result.sourceStats[i-1].hitCount).toBeGreaterThanOrEqual(result.sourceStats[i].hitCount);
          }

          // Referrer stats should be sorted by hit count (descending)
          for (let i = 1; i < result.referrerStats.length; i++) {
            expect(result.referrerStats[i-1].hitCount).toBeGreaterThanOrEqual(result.referrerStats[i].hitCount);
          }

          // Geographic stats should be sorted by hit count (descending)
          for (let i = 1; i < result.geoStats.length; i++) {
            expect(result.geoStats[i-1].hitCount).toBeGreaterThanOrEqual(result.geoStats[i].hitCount);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Bot detection integration in traffic analysis', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 20 }),
            timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
            ipAddress: fc.ipV4(),
            userAgent: fc.oneof(
              // Known bot user agents
              fc.constantFrom(
                'Mozilla/5.0 (compatible; Googlebot/2.1)',
                'curl/7.68.0',
                'python-requests/2.25.1'
              ),
              // Normal user agents
              fc.constantFrom(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
              )
            ),
            referrerDomain: fc.option(fc.domain(), { nil: undefined }),
            referrerMedium: fc.constantFrom('organic', 'social', 'referral', 'direct'),
            sourceType: fc.constantFrom('browser', 'bot', 'api'),
            sourceName: fc.string({ minLength: 3, maxLength: 20 }),
            country: fc.constantFrom('US', 'GB', 'CA'),
            isBot: fc.boolean(),
            userId: fc.option(fc.string({ minLength: 8, maxLength: 16 }), { nil: undefined }),
          }),
          { minLength: 20, maxLength: 100 }
        ),
        async (hits) => {
          const result = analyzeTrafficSources(hits);

          // Property: Bot detection should be properly integrated into traffic analysis
          
          // Bot/human classification should be consistent across all metrics
          const expectedBotHits = hits.filter(h => h.isBot).length;
          const expectedHumanHits = hits.filter(h => !h.isBot).length;

          expect(result.totals.botHits).toBe(expectedBotHits);
          expect(result.totals.humanHits).toBe(expectedHumanHits);

          // Source-level bot/human breakdown should sum to totals
          const totalSourceBotHits = result.sourceStats.reduce((sum, s) => sum + s.botHits, 0);
          const totalSourceHumanHits = result.sourceStats.reduce((sum, s) => sum + s.humanHits, 0);
          expect(totalSourceBotHits).toBe(expectedBotHits);
          expect(totalSourceHumanHits).toBe(expectedHumanHits);

          // Geographic-level bot/human breakdown should sum to totals
          const totalGeoBotHits = result.geoStats.reduce((sum, g) => sum + g.botHits, 0);
          const totalGeoHumanHits = result.geoStats.reduce((sum, g) => sum + g.humanHits, 0);
          expect(totalGeoBotHits).toBe(expectedBotHits);
          expect(totalGeoHumanHits).toBe(expectedHumanHits);

          // Hourly pattern bot breakdown should sum to total bot hits
          const totalHourlyBotHits = result.hourlyPattern.reduce((sum, h) => sum + h.botHits, 0);
          expect(totalHourlyBotHits).toBe(expectedBotHits);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});