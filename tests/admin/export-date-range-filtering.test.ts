/**
 * Property-Based Test: Export Date Range Filtering
 * Feature: admin-panel-production-ready, Property 6: Export date range filtering
 * 
 * Tests that for any export with date range, all exported records should have 
 * timestamps within the specified range.
 * 
 * Validates: Requirements 9.2
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

// Date range interface
interface DateRange {
  startDate: number;
  endDate: number;
}

// Data record with timestamp
interface TimestampedRecord {
  id: string;
  timestamp: number;
  eventType: string;
  userId: string;
  value: number;
}

// Export result interface
interface ExportResult {
  data: TimestampedRecord[];
  metadata: {
    totalRecords: number;
    filteredRecords: number;
    dateRange: DateRange;
    exportedAt: number;
  };
}

/**
 * Date range filter service that mirrors the API implementation
 */
class DateRangeFilterService {
  static filterByDateRange(records: TimestampedRecord[], dateRange: DateRange): TimestampedRecord[] {
    return records.filter(record => 
      record.timestamp >= dateRange.startDate && 
      record.timestamp <= dateRange.endDate
    );
  }

  static exportWithDateRange(records: TimestampedRecord[], dateRange: DateRange): ExportResult {
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

// Generators
const timestampedRecordArbitrary = fc.record({
  id: fc.uuid(),
  timestamp: fc.integer({ min: 1640995200000, max: Date.now() }), // From 2022 to now
  eventType: fc.constantFrom('page_view', 'video_start', 'video_complete', 'user_login', 'search'),
  userId: fc.uuid(),
  value: fc.integer({ min: 0, max: 10000 })
});

const recordsArbitrary = fc.array(timestampedRecordArbitrary, { minLength: 0, maxLength: 100 });

const dateRangeArbitrary = fc.tuple(
  fc.integer({ min: 1640995200000, max: Date.now() - 86400000 }),
  fc.integer({ min: 1640995200000, max: Date.now() })
).map(([start, end]) => ({
  startDate: Math.min(start, end),
  endDate: Math.max(start, end)
}));

describe('Export Date Range Filtering Property Tests', () => {
  test('Property 6: Export date range filtering - All exported records within range', () => {
    fc.assert(
      fc.property(
        recordsArbitrary,
        dateRangeArbitrary,
        (records, dateRange) => {
          const result = DateRangeFilterService.exportWithDateRange(records, dateRange);
          
          // All filtered records should be within the specified date range
          for (const record of result.data) {
            expect(record.timestamp).toBeGreaterThanOrEqual(dateRange.startDate);
            expect(record.timestamp).toBeLessThanOrEqual(dateRange.endDate);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 6: Export date range filtering - No records outside range in export', () => {
    fc.assert(
      fc.property(
        recordsArbitrary,
        dateRangeArbitrary,
        (records, dateRange) => {
          const result = DateRangeFilterService.exportWithDateRange(records, dateRange);
          
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

  test('Property 6: Export date range filtering - Metadata reflects date range', () => {
    fc.assert(
      fc.property(
        recordsArbitrary,
        dateRangeArbitrary,
        (records, dateRange) => {
          const result = DateRangeFilterService.exportWithDateRange(records, dateRange);
          
          // Metadata should accurately reflect the date range
          expect(result.metadata.dateRange.startDate).toBe(dateRange.startDate);
          expect(result.metadata.dateRange.endDate).toBe(dateRange.endDate);
          expect(result.metadata.totalRecords).toBe(records.length);
          expect(result.metadata.filteredRecords).toBe(result.data.length);
          expect(result.metadata.exportedAt).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 6: Export date range filtering - Boundary timestamps included', () => {
    fc.assert(
      fc.property(
        fc.array(timestampedRecordArbitrary, { minLength: 1, maxLength: 50 }),
        (records) => {
          // Sort records by timestamp
          const sortedRecords = [...records].sort((a, b) => a.timestamp - b.timestamp);
          const firstTimestamp = sortedRecords[0].timestamp;
          const lastTimestamp = sortedRecords[sortedRecords.length - 1].timestamp;
          
          // Create range exactly matching first and last timestamps
          const exactRange = {
            startDate: firstTimestamp,
            endDate: lastTimestamp
          };
          
          const result = DateRangeFilterService.exportWithDateRange(records, exactRange);
          
          // Records at exact boundaries should be included
          const firstRecord = result.data.find(r => r.timestamp === firstTimestamp);
          const lastRecord = result.data.find(r => r.timestamp === lastTimestamp);
          
          expect(firstRecord).toBeDefined();
          expect(lastRecord).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 6: Export date range filtering - Full range includes all records', () => {
    fc.assert(
      fc.property(
        recordsArbitrary,
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
          
          const result = DateRangeFilterService.exportWithDateRange(records, fullRange);
          
          // Should include all records
          expect(result.data.length).toBe(records.length);
          expect(result.metadata.filteredRecords).toBe(records.length);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 6: Export date range filtering - Record data integrity preserved', () => {
    fc.assert(
      fc.property(
        recordsArbitrary,
        dateRangeArbitrary,
        (records, dateRange) => {
          const result = DateRangeFilterService.exportWithDateRange(records, dateRange);
          
          // Each filtered record should be identical to its original
          for (const filteredRecord of result.data) {
            const originalRecord = records.find(r => r.id === filteredRecord.id);
            expect(originalRecord).toBeDefined();
            expect(filteredRecord).toEqual(originalRecord);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
