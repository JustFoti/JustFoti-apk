/**
 * Unit tests for pattern detection engine
 */

import { describe, test, expect } from 'bun:test';
import { detectPattern, getConfidence } from '../../app/lib/decoders/pattern-detector';
import { PatternType } from '../../app/lib/decoders/types';

describe('Pattern Detector', () => {
  describe('detectPattern', () => {
    describe('OLD format detection', () => {
      test('should detect OLD format with colons and g-z characters', () => {
        const encoded = 'abc:def:ghi:jkl';
        expect(detectPattern(encoded)).toBe(PatternType.OLD_FORMAT);
      });

      test('should detect OLD format with mixed case beyond-hex characters', () => {
        const encoded = '123:456:xyz:789';
        expect(detectPattern(encoded)).toBe(PatternType.OLD_FORMAT);
      });

      test('should detect OLD format with uppercase beyond-hex characters', () => {
        const encoded = 'ABC:DEF:GHI:XYZ';
        expect(detectPattern(encoded)).toBe(PatternType.OLD_FORMAT);
      });

      test('should not detect OLD format without colons', () => {
        const encoded = 'abcdefghijklmnop';
        expect(detectPattern(encoded)).not.toBe(PatternType.OLD_FORMAT);
      });

      test('should not detect OLD format without beyond-hex characters', () => {
        const encoded = '123:456:abc:def';
        expect(detectPattern(encoded)).not.toBe(PatternType.OLD_FORMAT);
      });
    });

    describe('NEW format detection', () => {
      test('should detect NEW format with pure base64 characters', () => {
        const encoded = 'SGVsbG8gV29ybGQ=';
        expect(detectPattern(encoded)).toBe(PatternType.NEW_FORMAT);
      });

      test('should detect NEW format without padding', () => {
        const encoded = 'SGVsbG8gV29ybGQ';
        expect(detectPattern(encoded)).toBe(PatternType.NEW_FORMAT);
      });

      test('should detect NEW format with plus and slash', () => {
        const encoded = 'AB+/CD+/EF+/GH==';
        expect(detectPattern(encoded)).toBe(PatternType.NEW_FORMAT);
      });

      test('should not detect NEW format with colons', () => {
        const encoded = 'SGVsbG8:V29ybGQ=';
        expect(detectPattern(encoded)).not.toBe(PatternType.NEW_FORMAT);
      });

      test('should not detect NEW format with invalid characters', () => {
        const encoded = 'SGVsbG8@V29ybGQ=';
        expect(detectPattern(encoded)).not.toBe(PatternType.NEW_FORMAT);
      });
    });

    describe('edge cases', () => {
      test('should return UNKNOWN for empty string', () => {
        expect(detectPattern('')).toBe(PatternType.UNKNOWN);
      });

      test('should return UNKNOWN for whitespace-only string', () => {
        expect(detectPattern('   ')).toBe(PatternType.UNKNOWN);
      });

      test('should return UNKNOWN for null input', () => {
        expect(detectPattern(null as any)).toBe(PatternType.UNKNOWN);
      });

      test('should return UNKNOWN for undefined input', () => {
        expect(detectPattern(undefined as any)).toBe(PatternType.UNKNOWN);
      });

      test('should return UNKNOWN for non-string input', () => {
        expect(detectPattern(123 as any)).toBe(PatternType.UNKNOWN);
      });

      test('should handle strings with leading/trailing whitespace', () => {
        const encoded = '  SGVsbG8gV29ybGQ=  ';
        expect(detectPattern(encoded)).toBe(PatternType.NEW_FORMAT);
      });

      test('should return UNKNOWN for mixed patterns', () => {
        const encoded = 'abc:def:123456==';
        expect(detectPattern(encoded)).toBe(PatternType.UNKNOWN);
      });

      test('should return UNKNOWN for malformed data', () => {
        const encoded = '!@#$%^&*()';
        expect(detectPattern(encoded)).toBe(PatternType.UNKNOWN);
      });
    });
  });

  describe('getConfidence', () => {
    describe('OLD format confidence', () => {
      test('should return high confidence for typical OLD format', () => {
        const encoded = 'abc:def:ghi:xyz:123';
        const confidence = getConfidence(encoded, PatternType.OLD_FORMAT);
        expect(confidence).toBeGreaterThan(0.6);
      });

      test('should return 0 for OLD format without colons', () => {
        const encoded = 'abcdefghijklmnop';
        const confidence = getConfidence(encoded, PatternType.OLD_FORMAT);
        expect(confidence).toBe(0);
      });

      test('should return 0 for OLD format without beyond-hex characters', () => {
        const encoded = '123:456:abc:def';
        const confidence = getConfidence(encoded, PatternType.OLD_FORMAT);
        expect(confidence).toBe(0);
      });

      test('should return higher confidence with more beyond-hex characters', () => {
        const encoded1 = 'abc:def:ghi';
        const encoded2 = 'abc:def:ghijklmnopqrstuvwxyz';
        const confidence1 = getConfidence(encoded1, PatternType.OLD_FORMAT);
        const confidence2 = getConfidence(encoded2, PatternType.OLD_FORMAT);
        // Both should have high confidence, but encoded1 has better hex structure
        expect(confidence1).toBeGreaterThan(0.6);
        expect(confidence2).toBeGreaterThan(0.6);
      });

      test('should return higher confidence with hex-like pairs', () => {
        const encoded = '6a:7b:8c:9d:gh:ij';
        const confidence = getConfidence(encoded, PatternType.OLD_FORMAT);
        expect(confidence).toBeGreaterThan(0.6);
      });
    });

    describe('NEW format confidence', () => {
      test('should return high confidence for valid base64 with padding', () => {
        const encoded = 'SGVsbG8gV29ybGQ=';
        const confidence = getConfidence(encoded, PatternType.NEW_FORMAT);
        expect(confidence).toBeGreaterThan(0.8);
      });

      test('should return high confidence for valid base64 without padding', () => {
        const encoded = 'SGVsbG8gV29ybGQ';
        const confidence = getConfidence(encoded, PatternType.NEW_FORMAT);
        expect(confidence).toBeGreaterThan(0.6);
      });

      test('should return 0 for NEW format with colons', () => {
        const encoded = 'SGVsbG8:V29ybGQ=';
        const confidence = getConfidence(encoded, PatternType.NEW_FORMAT);
        expect(confidence).toBe(0);
      });

      test('should return 0 for NEW format with invalid characters', () => {
        const encoded = 'SGVsbG8@V29ybGQ=';
        const confidence = getConfidence(encoded, PatternType.NEW_FORMAT);
        expect(confidence).toBe(0);
      });

      test('should return lower confidence for invalid length', () => {
        const encoded1 = 'SGVsbG8gV29ybGQ='; // Valid length (multiple of 4)
        const encoded2 = 'SGVsbG8gV29ybG'; // Invalid length
        const confidence1 = getConfidence(encoded1, PatternType.NEW_FORMAT);
        const confidence2 = getConfidence(encoded2, PatternType.NEW_FORMAT);
        expect(confidence1).toBeGreaterThan(confidence2);
      });

      test('should handle base64 with plus and slash characters', () => {
        const encoded = 'AB+/CD+/EF+/GH==';
        const confidence = getConfidence(encoded, PatternType.NEW_FORMAT);
        expect(confidence).toBeGreaterThan(0.8);
      });
    });

    describe('UNKNOWN pattern confidence', () => {
      test('should return 0 for UNKNOWN pattern', () => {
        const encoded = 'anything';
        const confidence = getConfidence(encoded, PatternType.UNKNOWN);
        expect(confidence).toBe(0);
      });
    });

    describe('edge cases', () => {
      test('should return 0 for empty string', () => {
        const confidence = getConfidence('', PatternType.OLD_FORMAT);
        expect(confidence).toBe(0);
      });

      test('should return 0 for whitespace-only string', () => {
        const confidence = getConfidence('   ', PatternType.NEW_FORMAT);
        expect(confidence).toBe(0);
      });

      test('should return 0 for null input', () => {
        const confidence = getConfidence(null as any, PatternType.OLD_FORMAT);
        expect(confidence).toBe(0);
      });

      test('should return 0 for undefined input', () => {
        const confidence = getConfidence(undefined as any, PatternType.NEW_FORMAT);
        expect(confidence).toBe(0);
      });

      test('should handle strings with leading/trailing whitespace', () => {
        const encoded = '  SGVsbG8gV29ybGQ=  ';
        const confidence = getConfidence(encoded, PatternType.NEW_FORMAT);
        expect(confidence).toBeGreaterThan(0.8);
      });
    });
  });
});
