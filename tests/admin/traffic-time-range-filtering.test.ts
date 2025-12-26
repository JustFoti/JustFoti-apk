/**
 * Property-Based Test: Time Range Filtering Accuracy
 * Feature: admin-panel-production-ready, Property 4: Time range filtering accuracy
 * 
 * Tests that for any time range selection, all fetched and displayed data 
 * should fall within the specified date range.
 * 
 * Validates: Requirements 4.3
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Traffic data record with timestamp
interface TrafficRecord {
  id: string;
  timestamp: number;
  source_type: string;
  hit_count: number;
  unique_visitors: number;
}

// Time range configuration
interface TimeRangeConfig {
  range: '24h' | '7d' | '30d';
  days: number;
}

// Time range to days mapping
const TIME_RANGE_MAP: Record<string, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
};

// Traffic filtering service
class TrafficFilterService {
  static getTimeRangeBounds(range: string): { startTime: number; endTime: number } {
    const days = TIME_RANGE_MAP[range] || 7;
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);
    return { startTime, endTime };
  }

  static filterByTimeRange(records: TrafficRecord[], range: string): TrafficRecord[] {
    const { startTime, endTime } = this.getTimeRangeBounds(range);
    return records.filter(record => 
      record.timestamp >= startTime && record.timestamp <= endTime
    );
  }

  static aggregateTrafficData(records: TrafficRecord[]): {
    total_hits: number;
    unique_visitors: number;
    sourceTypeStats: Array<{ source_type: string; hit_count: number; unique_visitors: number }>;
  } {
    const total_hits = records.reduce((sum, r) => sum + r.hit_count, 0);
    const unique_visitors = records.reduce((sum, r) => sum + r.unique_visitors, 0);
    
    // Group by source type
    const sourceMap = new Map<string, { hit_count: number; unique_visitors: number }>();
    for (const record of records) {
      const existing = sourceMap.get(record.source_type) || { hit_count: 0, unique_visitors: 0 };
      sourceMap.set(record.source_type, {
        hit_count: existing.hit_count + record.hit_count,
        unique_visitors: existing.unique_visitors + record.unique_visitors,
      });
    }
    
    const sourceTypeStats = Array.from(sourceMap.entries()).map(([source_type, stats]) => ({
      source_type,
      ...stats,
    }));
    
    return { total_hits, unique_visitors, sourceTypeStats };
  }

  static fetchTrafficData(records: TrafficRecord[], range: string): {
    data: TrafficRecord[];
    aggregated: ReturnType<typeof TrafficFilterService.aggregateTrafficData>;
    timeRange: { startTime: number; endTime: number };
  } {
    const filteredRecords = this.filterByTimeRange(records, range);
    const aggregated = this.aggregateTrafficData(filteredRecords);
    const timeRange = this.getTimeRangeBounds(range);
    
    return {
      data: filteredRecords,
      aggregated,
      timeRange,
    };
  }
}

// Property-based test generators
const trafficRecordArbitrary = fc.record({
  id: fc.uuid(),
  timestamp: fc.integer({ min: Date.now() - (60 * 24 * 60 * 60 * 1000), max: Date.now() }), // Last 60 days
  source_type: fc.constantFrom('browser', 'bot', 'api', 'social', 'rss', 'unknown'),
  hit_count: fc.integer({ min: 1, max: 10000 }),
  unique_visitors: fc.integer({ min: 1, max: 5000 }),
});

const trafficRecordsArbitrary = fc.array(trafficRecordArbitrary, { minLength: 0, maxLength: 100 });

const timeRangeArbitrary = fc.constantFrom('24h', '7d', '30d');

describe('Traffic Time Range Filtering Property Tests', () => {
  test('Property 4: Time range filtering - All filtered records within range', () => {
    fc.assert(
      fc.property(
        trafficRecordsArbitrary,
        timeRangeArbitrary,
        (records, range) => {
          const result = TrafficFilterService.fetchTrafficData(records, range);
          
          // All filtered records should be within the specified time range
          for (const record of result.data) {
            expect(record.timestamp).toBeGreaterThanOrEqual(result.timeRange.startTime);
            expect(record.timestamp).toBeLessThanOrEqual(result.timeRange.endTime);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Time range filtering - No records outside range', () => {
    fc.assert(
      fc.property(
        trafficRecordsArbitrary,
        timeRangeArbitrary,
        (records, range) => {
          const result = TrafficFilterService.fetchTrafficData(records, range);
          
          // Count records that should be excluded
          const recordsOutsideRange = records.filter(record => 
            record.timestamp < result.timeRange.startTime || record.timestamp > result.timeRange.endTime
          );
          
          // Filtered count should equal total minus excluded
          const expectedFilteredCount = records.length - recordsOutsideRange.length;
          expect(result.data.length).toBe(expectedFilteredCount);
          
          // No record in the result should be outside the range
          const outsideRangeInResult = result.data.filter(record =>
            record.timestamp < result.timeRange.startTime || record.timestamp > result.timeRange.endTime
          );
          expect(outsideRangeInResult.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Time range filtering - Aggregated data matches filtered records', () => {
    fc.assert(
      fc.property(
        trafficRecordsArbitrary,
        timeRangeArbitrary,
        (records, range) => {
          const result = TrafficFilterService.fetchTrafficData(records, range);
          
          // Aggregated totals should match sum of filtered records
          const expectedTotalHits = result.data.reduce((sum, r) => sum + r.hit_count, 0);
          const expectedUniqueVisitors = result.data.reduce((sum, r) => sum + r.unique_visitors, 0);
          
          expect(result.aggregated.total_hits).toBe(expectedTotalHits);
          expect(result.aggregated.unique_visitors).toBe(expectedUniqueVisitors);
          
          // Source type stats should sum to totals
          const sourceTypeHits = result.aggregated.sourceTypeStats.reduce((sum, s) => sum + s.hit_count, 0);
          expect(sourceTypeHits).toBe(expectedTotalHits);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Time range filtering - Shorter ranges are subsets of longer ranges', () => {
    fc.assert(
      fc.property(
        trafficRecordsArbitrary,
        (records) => {
          const result24h = TrafficFilterService.fetchTrafficData(records, '24h');
          const result7d = TrafficFilterService.fetchTrafficData(records, '7d');
          const result30d = TrafficFilterService.fetchTrafficData(records, '30d');
          
          // 24h results should be a subset of 7d results
          const ids24h = new Set(result24h.data.map(r => r.id));
          const ids7d = new Set(result7d.data.map(r => r.id));
          const ids30d = new Set(result30d.data.map(r => r.id));
          
          // Every record in 24h should be in 7d
          for (const id of ids24h) {
            expect(ids7d.has(id)).toBe(true);
          }
          
          // Every record in 7d should be in 30d
          for (const id of ids7d) {
            expect(ids30d.has(id)).toBe(true);
          }
          
          // Count relationships
          expect(result24h.data.length).toBeLessThanOrEqual(result7d.data.length);
          expect(result7d.data.length).toBeLessThanOrEqual(result30d.data.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Time range filtering - Time range bounds are correct', () => {
    fc.assert(
      fc.property(
        timeRangeArbitrary,
        (range) => {
          const bounds = TrafficFilterService.getTimeRangeBounds(range);
          const expectedDays = TIME_RANGE_MAP[range];
          const expectedDuration = expectedDays * 24 * 60 * 60 * 1000;
          
          // End time should be close to now (within 1 second tolerance)
          expect(bounds.endTime).toBeGreaterThanOrEqual(Date.now() - 1000);
          expect(bounds.endTime).toBeLessThanOrEqual(Date.now() + 1000);
          
          // Duration should match expected days
          const actualDuration = bounds.endTime - bounds.startTime;
          expect(actualDuration).toBe(expectedDuration);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Time range filtering - Preserves record integrity', () => {
    fc.assert(
      fc.property(
        trafficRecordsArbitrary,
        timeRangeArbitrary,
        (records, range) => {
          const result = TrafficFilterService.fetchTrafficData(records, range);
          
          // Each filtered record should be identical to its original
          for (const filteredRecord of result.data) {
            const originalRecord = records.find(r => r.id === filteredRecord.id);
            expect(originalRecord).toBeDefined();
            expect(filteredRecord).toEqual(originalRecord);
          }
          
          // No record should be modified during filtering
          const originalRecordMap = new Map(records.map(r => [r.id, r]));
          for (const filteredRecord of result.data) {
            const original = originalRecordMap.get(filteredRecord.id);
            expect(filteredRecord.source_type).toBe(original?.source_type);
            expect(filteredRecord.hit_count).toBe(original?.hit_count);
            expect(filteredRecord.unique_visitors).toBe(original?.unique_visitors);
            expect(filteredRecord.timestamp).toBe(original?.timestamp);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4: Time range filtering - Empty input returns empty output', () => {
    fc.assert(
      fc.property(
        timeRangeArbitrary,
        (range) => {
          const result = TrafficFilterService.fetchTrafficData([], range);
          
          expect(result.data.length).toBe(0);
          expect(result.aggregated.total_hits).toBe(0);
          expect(result.aggregated.unique_visitors).toBe(0);
          expect(result.aggregated.sourceTypeStats.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
