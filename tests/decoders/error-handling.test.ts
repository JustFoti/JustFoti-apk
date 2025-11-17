/**
 * Tests for error handling and pattern storage functionality
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  createInvalidInputError,
  createDecodeFailedError,
  createNoUrlsFoundError,
  formatErrorMessage,
  isDecoderError,
} from '../../app/lib/decoders/error-handler';
import {
  patternStorage,
  saveFailedDecode,
  getUnknownPatterns,
  getStorageStatistics,
} from '../../app/lib/decoders/pattern-storage';
import { PatternType, DecoderErrorType } from '../../app/lib/decoders/types';

describe('Error Handler', () => {
  describe('Error Factory Functions', () => {
    it('should create invalid input error', () => {
      const error = createInvalidInputError('Test error', 'test-string');
      
      expect(error.type).toBe(DecoderErrorType.INVALID_INPUT);
      expect(error.message).toBe('Test error');
      expect(error.context.encodedString).toBe('test-string');
    });

    it('should create decode failed error', () => {
      const error = createDecodeFailedError(
        'Decode failed',
        'encoded-string',
        PatternType.OLD_FORMAT,
        ['decoder1', 'decoder2']
      );
      
      expect(error.type).toBe(DecoderErrorType.DECODE_FAILED);
      expect(error.message).toBe('Decode failed');
      expect(error.context.pattern).toBe(PatternType.OLD_FORMAT);
      expect(error.context.attemptedDecoders).toEqual(['decoder1', 'decoder2']);
    });

    it('should create no URLs found error', () => {
      const error = createNoUrlsFoundError(
        'No URLs found',
        'encoded-string',
        PatternType.NEW_FORMAT
      );
      
      expect(error.type).toBe(DecoderErrorType.NO_URLS_FOUND);
      expect(error.message).toBe('No URLs found');
      expect(error.context.pattern).toBe(PatternType.NEW_FORMAT);
    });

    it('should truncate long encoded strings', () => {
      const longString = 'a'.repeat(200);
      const error = createInvalidInputError('Test', longString);
      
      expect(error.context.encodedString?.length).toBeLessThanOrEqual(103); // 100 + '...'
    });
  });

  describe('Error Formatting', () => {
    it('should format error message with pattern', () => {
      const error = createDecodeFailedError(
        'Test error',
        'encoded',
        PatternType.OLD_FORMAT
      );
      
      const formatted = formatErrorMessage(error);
      expect(formatted).toContain('decode_failed');
      expect(formatted).toContain('Test error');
      expect(formatted).toContain('old_format');
    });

    it('should format error message with attempted decoders', () => {
      const error = createDecodeFailedError(
        'Test error',
        'encoded',
        undefined,
        ['decoder1', 'decoder2']
      );
      
      const formatted = formatErrorMessage(error);
      expect(formatted).toContain('decoder1');
      expect(formatted).toContain('decoder2');
    });
  });

  describe('Error Type Checking', () => {
    it('should identify valid DecoderError', () => {
      const error = createInvalidInputError('Test', 'string');
      expect(isDecoderError(error)).toBe(true);
    });

    it('should reject invalid error objects', () => {
      expect(isDecoderError(null)).toBeFalsy();
      expect(isDecoderError(undefined)).toBeFalsy();
      expect(isDecoderError({})).toBe(false);
      expect(isDecoderError({ type: 'invalid' })).toBe(false);
    });
  });
});

describe('Pattern Storage', () => {
  beforeEach(() => {
    // Clear storage before each test
    patternStorage.clear();
  });

  describe('Saving Failed Attempts', () => {
    it('should save failed decode attempt', () => {
      const error = createDecodeFailedError('Test error', 'encoded-string');
      saveFailedDecode('encoded-string', PatternType.UNKNOWN, ['decoder1'], error);
      
      const attempts = patternStorage.getFailedAttempts();
      expect(attempts.length).toBe(1);
      expect(attempts[0].encodedString).toBe('encoded-string');
      expect(attempts[0].detectedPattern).toBe(PatternType.UNKNOWN);
    });

    it('should include character analysis in diagnostics', () => {
      const error = createDecodeFailedError('Test error', 'test:string');
      saveFailedDecode('test:string', PatternType.UNKNOWN, [], error);
      
      const attempts = patternStorage.getFailedAttempts();
      expect(attempts[0].diagnostics.characterAnalysis.hasColons).toBe(true);
    });

    it('should truncate sample in diagnostics', () => {
      const longString = 'a'.repeat(200);
      const error = createDecodeFailedError('Test error', longString);
      saveFailedDecode(longString, PatternType.UNKNOWN, [], error);
      
      const attempts = patternStorage.getFailedAttempts();
      expect(attempts[0].diagnostics.sample.length).toBeLessThanOrEqual(103);
    });
  });

  describe('Retrieving Failed Attempts', () => {
    it('should get unknown pattern attempts only', () => {
      const error = createDecodeFailedError('Test error', 'encoded');
      
      saveFailedDecode('unknown1', PatternType.UNKNOWN, [], error);
      saveFailedDecode('old1', PatternType.OLD_FORMAT, [], error);
      saveFailedDecode('unknown2', PatternType.UNKNOWN, [], error);
      
      const unknownAttempts = getUnknownPatterns();
      expect(unknownAttempts.length).toBe(2);
      expect(unknownAttempts.every(a => a.detectedPattern === PatternType.UNKNOWN)).toBe(true);
    });

    it('should group attempts by pattern', () => {
      const error = createDecodeFailedError('Test error', 'encoded');
      
      saveFailedDecode('unknown1', PatternType.UNKNOWN, [], error);
      saveFailedDecode('old1', PatternType.OLD_FORMAT, [], error);
      saveFailedDecode('unknown2', PatternType.UNKNOWN, [], error);
      
      const grouped = patternStorage.getAttemptsByPattern();
      expect(grouped.get(PatternType.UNKNOWN)?.length).toBe(2);
      expect(grouped.get(PatternType.OLD_FORMAT)?.length).toBe(1);
    });
  });

  describe('Storage Statistics', () => {
    it('should provide accurate statistics', () => {
      const error = createDecodeFailedError('Test error', 'encoded');
      
      saveFailedDecode('unknown1', PatternType.UNKNOWN, [], error);
      saveFailedDecode('old1', PatternType.OLD_FORMAT, [], error);
      saveFailedDecode('unknown2', PatternType.UNKNOWN, [], error);
      
      const stats = getStorageStatistics();
      expect(stats.totalAttempts).toBe(3);
      expect(stats.unknownPatterns).toBe(2);
      expect(stats.byPattern[PatternType.UNKNOWN]).toBe(2);
      expect(stats.byPattern[PatternType.OLD_FORMAT]).toBe(1);
    });

    it('should include recent attempts', () => {
      const error = createDecodeFailedError('Test error', 'encoded');
      
      for (let i = 0; i < 15; i++) {
        saveFailedDecode(`encoded${i}`, PatternType.UNKNOWN, [], error);
      }
      
      const stats = getStorageStatistics();
      expect(stats.recentAttempts.length).toBe(10); // Last 10
    });
  });

  describe('Storage Management', () => {
    it('should respect max storage size', () => {
      patternStorage.setMaxStorageSize(5);
      const error = createDecodeFailedError('Test error', 'encoded');
      
      for (let i = 0; i < 10; i++) {
        saveFailedDecode(`encoded${i}`, PatternType.UNKNOWN, [], error);
      }
      
      const attempts = patternStorage.getFailedAttempts();
      expect(attempts.length).toBe(5);
      // Should keep most recent
      expect(attempts[0].encodedString).toBe('encoded5');
    });

    it('should clear storage', () => {
      const error = createDecodeFailedError('Test error', 'encoded');
      saveFailedDecode('encoded', PatternType.UNKNOWN, [], error);
      
      expect(patternStorage.getFailedAttempts().length).toBe(1);
      
      patternStorage.clear();
      expect(patternStorage.getFailedAttempts().length).toBe(0);
    });
  });

  describe('Similar Attempts', () => {
    it('should find similar attempts based on characteristics', () => {
      const error = createDecodeFailedError('Test error', 'encoded');
      
      // Save attempts with different characteristics
      saveFailedDecode('base64string==', PatternType.UNKNOWN, [], error);
      saveFailedDecode('hex:string:with:colons', PatternType.UNKNOWN, [], error);
      saveFailedDecode('anotherbase64==', PatternType.UNKNOWN, [], error);
      
      // Find similar to a base64-like string
      const similar = patternStorage.findSimilarAttempts('newbase64string==', 2);
      
      expect(similar.length).toBeGreaterThan(0);
      // Should prioritize base64-like strings
      expect(similar[0].encodedString).toMatch(/base64/);
    });
  });

  describe('Export Functionality', () => {
    it('should export to JSON', () => {
      const error = createDecodeFailedError('Test error', 'encoded');
      saveFailedDecode('encoded', PatternType.UNKNOWN, [], error);
      
      const json = patternStorage.exportToJson();
      const parsed = JSON.parse(json);
      
      expect(parsed.totalAttempts).toBe(1);
      expect(parsed.attempts).toHaveLength(1);
      expect(parsed.exportDate).toBeDefined();
    });
  });
});
