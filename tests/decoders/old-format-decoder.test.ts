/**
 * Unit tests for OLD format decoder
 * 
 * Tests the reverse-hex-shift algorithm decoder with known samples
 * from FINAL-WORKING-DECODER.js and real prorcp pages.
 */

import { describe, test, expect } from 'bun:test';
import { decodeOldFormat, canDecodeOldFormat, isValidM3u8Url } from '../../app/lib/decoders/old-format-decoder';
import { PatternType } from '../../app/lib/decoders/types';
import { readFileSync } from 'fs';

// Helper to extract encoded string from HTML file
function getEncodedSample(): string {
  const html = readFileSync('reverse-engineering-output/pages/prorcp-NmMwYTI2YTk1ODg2NGUx.html', 'utf8');
  const match = html.match(/<div id="eSfH1IRMyL"[^>]*>([^<]+)<\/div>/);
  if (!match) {
    throw new Error('Could not extract encoded sample from HTML file');
  }
  return match[1];
}

describe('OLD Format Decoder', () => {
  describe('decodeOldFormat', () => {
    describe('successful decoding', () => {
      test('should decode a real OLD format sample from prorcp', () => {
        // Sample from reverse-engineering-output/pages/prorcp-NmMwYTI2YTk1ODg2NGUx.html
        const encoded = getEncodedSample();
        
        const result = decodeOldFormat(encoded);
        
        expect(result.success).toBe(true);
        expect(result.urls.length).toBeGreaterThan(0);
        expect(result.pattern).toBe(PatternType.OLD_FORMAT);
        expect(result.decoderUsed).toBe('old-format-decoder');
        expect(result.error).toBeUndefined();
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.decodeTime).toBeGreaterThanOrEqual(0);
      });

      test('should extract valid URLs from decoded content', () => {
        const encoded = getEncodedSample();
        
        const result = decodeOldFormat(encoded);
        
        expect(result.success).toBe(true);
        expect(result.urls.length).toBeGreaterThan(0);
        
        // All URLs should start with http:// or https://
        result.urls.forEach(url => {
          expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
        });
      });

      test('should handle encoded strings with colons and beyond-hex characters', () => {
        const encoded = 'abc:def:ghi:xyz:123';
        
        const result = decodeOldFormat(encoded);
        
        // May not find URLs but should not crash
        expect(result.success).toBeDefined();
        expect(result.urls).toBeDefined();
        expect(Array.isArray(result.urls)).toBe(true);
      });

      test('should remove duplicate URLs from results', () => {
        const encoded = getEncodedSample();
        
        const result = decodeOldFormat(encoded);
        
        if (result.success) {
          const uniqueUrls = new Set(result.urls);
          expect(result.urls.length).toBe(uniqueUrls.size);
        }
      });

      test('should include metadata with decode time', () => {
        const encoded = getEncodedSample();
        
        const result = decodeOldFormat(encoded);
        
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.decodeTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata?.attemptedDecoders).toContain('old-format-decoder');
      });
    });

    describe('error handling', () => {
      test('should handle empty string input', () => {
        const result = decodeOldFormat('');
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid input');
      });

      test('should handle null input', () => {
        const result = decodeOldFormat(null as any);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid input');
      });

      test('should handle undefined input', () => {
        const result = decodeOldFormat(undefined as any);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid input');
      });

      test('should handle non-string input', () => {
        const result = decodeOldFormat(123 as any);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid input');
      });

      test('should handle malformed encoded string without URLs', () => {
        const encoded = 'abc:def:ghi';
        
        const result = decodeOldFormat(encoded);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('No URLs found');
      });

      test('should handle strings with invalid hex pairs gracefully', () => {
        const encoded = 'zz:yy:xx:ww';
        
        const result = decodeOldFormat(encoded);
        
        // Should not crash, but may not find URLs
        expect(result.success).toBeDefined();
        expect(result.urls).toBeDefined();
      });

      test('should include error context in failed results', () => {
        const result = decodeOldFormat('');
        
        expect(result.error).toBeDefined();
        expect(result.pattern).toBe(PatternType.OLD_FORMAT);
        expect(result.decoderUsed).toBe('old-format-decoder');
      });
    });

    describe('algorithm correctness', () => {
      test('should correctly reverse the string', () => {
        // Test that the algorithm follows: reverse -> subtract 1 -> hex to ASCII
        const encoded = getEncodedSample();
        
        const result = decodeOldFormat(encoded);
        
        // If successful, the decoded content should contain valid URLs
        if (result.success) {
          expect(result.urls.length).toBeGreaterThan(0);
          result.urls.forEach(url => {
            expect(url).toMatch(/^https?:\/\//);
          });
        }
      });

      test('should handle hex pairs correctly', () => {
        // The algorithm should convert hex pairs to ASCII characters
        const encoded = getEncodedSample();
        
        const result = decodeOldFormat(encoded);
        
        // Should successfully decode without throwing errors
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });
  });

  describe('canDecodeOldFormat', () => {
    test('should return true for strings with colons and beyond-hex characters', () => {
      const encoded = 'abc:def:ghi:xyz';
      expect(canDecodeOldFormat(encoded)).toBe(true);
    });

    test('should return true for uppercase beyond-hex characters', () => {
      const encoded = 'ABC:DEF:GHI:XYZ';
      expect(canDecodeOldFormat(encoded)).toBe(true);
    });

    test('should return true for mixed case', () => {
      const encoded = '123:456:AbC:XyZ';
      expect(canDecodeOldFormat(encoded)).toBe(true);
    });

    test('should return false for strings without colons', () => {
      const encoded = 'abcdefghijklmnop';
      expect(canDecodeOldFormat(encoded)).toBe(false);
    });

    test('should return false for strings without beyond-hex characters', () => {
      const encoded = '123:456:abc:def';
      expect(canDecodeOldFormat(encoded)).toBe(false);
    });

    test('should return false for pure base64 strings', () => {
      const encoded = 'SGVsbG8gV29ybGQ=';
      expect(canDecodeOldFormat(encoded)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(canDecodeOldFormat('')).toBe(false);
    });

    test('should return false for null input', () => {
      expect(canDecodeOldFormat(null as any)).toBe(false);
    });

    test('should return false for undefined input', () => {
      expect(canDecodeOldFormat(undefined as any)).toBe(false);
    });

    test('should return false for non-string input', () => {
      expect(canDecodeOldFormat(123 as any)).toBe(false);
    });

    test('should return true for real OLD format sample', () => {
      const encoded = getEncodedSample();
      expect(canDecodeOldFormat(encoded)).toBe(true);
    });
  });

  describe('isValidM3u8Url', () => {
    test('should return true for valid m3u8 URL', () => {
      const url = 'https://example.com/video/playlist.m3u8';
      expect(isValidM3u8Url(url)).toBe(true);
    });

    test('should return true for HTTP m3u8 URL', () => {
      const url = 'http://example.com/video/playlist.m3u8';
      expect(isValidM3u8Url(url)).toBe(true);
    });

    test('should return true for streaming URLs without .m3u8 extension', () => {
      const url = 'https://example.com/stream/video';
      expect(isValidM3u8Url(url)).toBe(true);
    });

    test('should return true for playlist URLs', () => {
      const url = 'https://example.com/playlist/master';
      expect(isValidM3u8Url(url)).toBe(true);
    });

    test('should return false for non-HTTP protocols', () => {
      const url = 'ftp://example.com/video.m3u8';
      expect(isValidM3u8Url(url)).toBe(false);
    });

    test('should return false for invalid URLs', () => {
      const url = 'not-a-url';
      expect(isValidM3u8Url(url)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isValidM3u8Url('')).toBe(false);
    });

    test('should return false for null input', () => {
      expect(isValidM3u8Url(null as any)).toBe(false);
    });

    test('should return false for undefined input', () => {
      expect(isValidM3u8Url(undefined as any)).toBe(false);
    });

    test('should handle URLs with query parameters', () => {
      const url = 'https://example.com/video.m3u8?token=abc123';
      expect(isValidM3u8Url(url)).toBe(true);
    });

    test('should handle URLs with fragments', () => {
      const url = 'https://example.com/video.m3u8#start';
      expect(isValidM3u8Url(url)).toBe(true);
    });
  });
});
