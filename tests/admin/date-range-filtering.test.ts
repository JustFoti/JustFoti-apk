/**
 * Property-Based Test: Date Range Filtering
 * Feature: admin-panel-unified-refactor, Property 36: Date range filtering
 * 
 * Tests that for any custom date range selection, the exported data contains 
 * only records within the specified time period.
 * 
 * Validates: Requirements 8.3
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Mock data record with timestamp
interface DataRecord {
  id: string;
  timestamp: number;
  userId: string;
  eventType: string;
  value: number;
}

// Date range interface
interface DateRange {
  startDate: number;
  endDate: number;
}

// Mock data filtering service
class DataFilterService {
  static filterByDateRange(records: DataRecord[], dateRange: DateRange): DataRecord[] {
    return records.filter(record => 
      record.timestamp >= dateRange.startDate && 
      record.timestamp <= dateRange.endDate
    );
  }

  static exportWithDateRange(records: DataRecord[], dateRange: DateRange): {
    data: DataRecord[];
    metadata: {
      totalRecords: number;
      filteredRecords: number;
      dateRange: DateRange;
      exportedAt: number;
    };
  } {
    const filteredData = this.filterByDateRange(records, dateRange);
    
    return {
      data: filteredData,
      metadata: {
        totalRecords: records.length,
        filteredRecords: filteredData.length,
        dateRange,
        exportedAt: Date.now()
      }
    };
  }
}

// Property-based test generators
const dataRecordArbitrary = fc.record({
  id: fc.uuid(),
  timestamp: fc.integer({ min: 1640995200000, max: Date.now() }), // From 2022 to now
  userId: fc.uuid(),
  eventType: fc.constantFrom('page_view', 'video_start', 'video_complete', 'user_login', 'search'),
  value: fc.integer({ min: 0, max: 10000 })
});

const dataRecordsArbitrary = fc.array(dataRecordArbitrary, { minLength: 0, maxLength: 100 });

const dateRangeArbitrary = fc.tuple(
  fc.integer({ min: 1640995200000, max: Date.now() - 86400000 }), // Start date
  fc.integer({ min: 1640995200000, max: Date.now() }) // End date
).map(([start, end]) => ({
  startDate: Math.min(start, end),
  endDate: Math.max(start, end)
}));

describe('Date Range Filtering Property Tests', () => {
  test('Property 36: Date range filtering - All filtered records within range', () => {
    fc.assert(
      fc.property(
        dataRecordsArbitrary,
        dateRangeArbitrary,
        (records, dateRange) => {
          const result = DataFilterService.exportWithDateRange(records, dateRange);
          
          // All filtered records should be within the specified date range
          for (const record of result.data) {
            expect(record.timestamp).toBeGreaterThanOrEqual(dateRange.startDate);
            expect(record.timestamp).toBeLessThanOrEqual(dateRange.endDate);
          }
          
          // Metadata should be accurate
          expect(result.metadata.totalRecords).toBe(records.length);
          expect(result.metadata.filteredRecords).toBe(result.data.length);
          expect(result.metadata.dateRange).toEqual(dateRange);
          expect(result.metadata.exportedAt).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 36: Date range filtering - No records outside range', () => {
    fc.assert(
      fc.property(
        dataRecordsArbitrary,
        dateRangeArbitrary,
        (records, dateRange) => {
          const result = DataFilterService.exportWithDateRange(records, dateRange);
          
          // Count records that should be excluded
          const recordsOutsideRange = records.filter(record => 
            record.timestamp < dateRange.startDate || record.timestamp > dateRange.endDate
          );
          
          // Filtered count should equal total minus excluded
          const expectedFilteredCount = records.length - recordsOutsideRange.length;
          expect(result.data.length).toBe(expectedFilteredCount);
          
          // No record in the result should be outside the range
          const outsideRangeInResult = result.data.filter(record =>
            record.timestamp < dateRange.startDate || record.timestamp > dateRange.endDate
          );
          expect(outsideRangeInResult.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 36: Date range filtering - Empty range returns empty results', () => {
    fc.assert(
      fc.property(
        dataRecordsArbitrary,
        fc.integer({ min: 1640995200000, max: Date.now() }),
        (records, timestamp) => {
          // Create an empty range (start > end)
          const emptyRange = {
            startDate: timestamp + 1000,
            endDate: timestamp
          };
          
          const result = DataFilterService.exportWithDateRange(records, emptyRange);
          
          // Should return empty results for invalid range
          expect(result.data.length).toBe(0);
          expect(result.metadata.filteredRecords).toBe(0);
          expect(result.metadata.totalRecords).toBe(records.length);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 36: Date range filtering - Full range includes all records', () => {
    fc.assert(
      fc.property(
        dataRecordsArbitrary,
        (records) => {
          if (records.length === 0) return true;
          
          // Create a range that encompasses all records
          const timestamps = records.map(r => r.timestamp);
          const minTimestamp = Math.min(...timestamps);
          const maxTimestamp = Math.max(...timestamps);
          
          const fullRange = {
            startDate: minTimestamp - 1000,
            endDate: maxTimestamp + 1000
          };
          
          const result = DataFilterService.exportWithDateRange(records, fullRange);
          
          // Should include all records
          expect(result.data.length).toBe(records.length);
          expect(result.metadata.filteredRecords).toBe(records.length);
          
          // All original records should be present
          const resultIds = new Set(result.data.map(r => r.id));
          for (const record of records) {
            expect(resultIds.has(record.id)).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 36: Date range filtering - Boundary conditions', () => {
    fc.assert(
      fc.property(
        fc.array(dataRecordArbitrary, { minLength: 1, maxLength: 50 }),
        (records) => {
          // Test exact boundary conditions
          const sortedRecords = records.sort((a, b) => a.timestamp - b.timestamp);
          const firstTimestamp = sortedRecords[0].timestamp;
          const lastTimestamp = sortedRecords[sortedRecords.length - 1].timestamp;
          
          // Test inclusive boundaries
          const exactRange = {
            startDate: firstTimestamp,
            endDate: lastTimestamp
          };
          
          const result = DataFilterService.exportWithDateRange(records, exactRange);
          
          // Should include records at exact boundaries
          const firstRecord = result.data.find(r => r.timestamp === firstTimestamp);
          const lastRecord = result.data.find(r => r.timestamp === lastTimestamp);
          
          expect(firstRecord).toBeDefined();
          expect(lastRecord).toBeDefined();
          
          // All records should be within or at boundaries
          for (const record of result.data) {
            expect(record.timestamp).toBeGreaterThanOrEqual(firstTimestamp);
            expect(record.timestamp).toBeLessThanOrEqual(lastTimestamp);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 36: Date range filtering - Preserves record integrity', () => {
    fc.assert(
      fc.property(
        dataRecordsArbitrary,
        dateRangeArbitrary,
        (records, dateRange) => {
          const result = DataFilterService.exportWithDateRange(records, dateRange);
          
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
            expect(filteredRecord.userId).toBe(original?.userId);
            expect(filteredRecord.eventType).toBe(original?.eventType);
            expect(filteredRecord.value).toBe(original?.value);
            expect(filteredRecord.timestamp).toBe(original?.timestamp);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});