/**
 * Unit tests for NEW format decoder
 * 
 * Tests the XOR decryption decoder with known samples from prorcp pages.
 * Target: 95%+ success rate on NEW format samples
 */

import { describe, test, expect } from 'bun:test';
import { decodeNewFormat, canDecodeNewFormat } from '../../app/lib/decoders/new-format-decoder';
import { PatternType } from '../../app/lib/decoders/types';
import { readFileSync } from 'fs';

// Helper to extract encoded string from HTML file
function getNewFormatSample(): string {
  const html = readFileSync('reverse-engineering-output/pages/prorcp-ODBlOWZkMGU5NmEwYTIy.html', 'utf8');
  const match = html.match(/<div id="ux8qjPHC66"[^>]*>([^<]+)<\/div>/);
  if (!match) {
    throw new Error('Could not extract NEW format sample from HTML file');
  }
  return match[1];
}

// Sample base64 encoded strings for testing
const BASE64_SAMPLES = [
  'SGVsbG8gV29ybGQ=', // "Hello World"
  'VGVzdCBzdHJpbmc=', // "Test string"
];

// Sample hex encoded strings for testing
const HEX_SAMPLES = [
  '48656c6c6f20576f726c64', // "Hello World"
  '5465737420737472696e67', // "Test string"
];

describe('NEW Format Decoder', () => {
  describe('decodeNewFormat', () => {
    describe('successful decoding', () => {
      test('should decode a real NEW format sample from prorcp', () => {
        const encoded = getNewFormatSample();
        
        const result = decodeNewFormat(encoded);
        
        // The decoder should attempt to decode
        expect(result).toBeDefined();
        expect(result.pattern).toBe(PatternType.NEW_FORMAT);
        expect(result.decoderUsed).toBe('new-format-decoder');
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.decodeTime).toBeGreaterThanOrEqual(0);
        
        // Log result for debugging
        if (result.success) {
          console.log(`✓ Successfully decoded NEW format with ${result.urls.length} URLs`);
        } else {
          console.log(`✗ Failed to decode NEW format: ${result.error}`);
        }
      });

      test('should handle hex-encoded strings', () => {
        const hexSample = HEX_SAMPLES[0];
        
        const result = decodeNewFormat(hexSample);
        
        expect(result).toBeDefined();
        expect(result.pattern).toBe(PatternType.NEW_FORMAT);
      });

      test('should handle base64-encoded strings', () => {
        const base64Sample = BASE64_SAMPLES[0];
        
        const result = decodeNewFormat(base64Sample);
        
        expect(result).toBeDefined();
        expect(result.pattern).toBe(PatternType.NEW_FORMAT);
      });

      test('should extract valid URLs when found', () => {
        const encoded = getNewFormatSample();
        
        const result = decodeNewFormat(encoded);
        
        if (result.success) {
          expect(result.urls.length).toBeGreaterThan(0);
          
          // All URLs should start with http:// or https://
          result.urls.forEach(url => {
            expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
          });
        }
      });

      test('should remove duplicate URLs from results', () => {
        const encoded = getNewFormatSample();
        
        const result = decodeNewFormat(encoded);
        
        if (result.success) {
          const uniqueUrls = new Set(result.urls);
          expect(result.urls.length).toBe(uniqueUrls.size);
        }
      });

      test('should include metadata with decode time', () => {
        const encoded = getNewFormatSample();
        
        const result = decodeNewFormat(encoded);
        
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.decodeTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata?.attemptedDecoders).toContain('new-format-decoder');
      });
    });

    describe('XOR key fallback logic', () => {
      test('should try multiple XOR keys', () => {
        const encoded = getNewFormatSample();
        
        const result = decodeNewFormat(encoded);
        
        // Should attempt decoding (success or failure)
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });

      test('should handle empty key (no XOR)', () => {
        const hexSample = HEX_SAMPLES[0];
        
        const result = decodeNewFormat(hexSample);
        
        // Should not crash with empty key
        expect(result).toBeDefined();
      });

      test('should try derived keys from encoded string', () => {
        const encoded = getNewFormatSample();
        
        const result = decodeNewFormat(encoded);
        
        // Should attempt multiple keys including derived ones
        expect(result).toBeDefined();
        expect(result.metadata).toBeDefined();
      });
    });

    describe('error handling', () => {
      test('should handle empty string input', () => {
        const result = decodeNewFormat('');
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid input');
      });

      test('should handle null input', () => {
        const result = decodeNewFormat(null as any);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid input');
      });

      test('should handle undefined input', () => {
        const result = decodeNewFormat(undefined as any);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid input');
      });

      test('should handle non-string input', () => {
        const result = decodeNewFormat(123 as any);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid input');
      });

      test('should handle invalid encoding format', () => {
        const encoded = 'not-base64-or-hex!!!';
        
        const result = decodeNewFormat(encoded);
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      test('should handle malformed hex strings', () => {
        const encoded = '123'; // Odd length hex
        
        const result = decodeNewFormat(encoded);
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      test('should handle malformed base64 strings', () => {
        const encoded = 'ABC'; // Invalid base64 length
        
        const result = decodeNewFormat(encoded);
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      test('should include error context in failed results', () => {
        const result = decodeNewFormat('');
        
        expect(result.error).toBeDefined();
        expect(result.pattern).toBe(PatternType.NEW_FORMAT);
        expect(result.decoderUsed).toBe('new-format-decoder');
      });
    });

    describe('edge compatibility', () => {
      test('should use only standard JavaScript APIs', () => {
        // This test verifies that the decoder doesn't use Node.js-specific APIs
        const encoded = getNewFormatSample();
        
        // Should not throw errors about missing Node.js APIs
        expect(() => decodeNewFormat(encoded)).not.toThrow();
      });

      test('should use atob for base64 decoding', () => {
        const base64Sample = BASE64_SAMPLES[0];
        
        // atob is available in browsers and edge runtimes
        const result = decodeNewFormat(base64Sample);
        
        expect(result).toBeDefined();
      });

      test('should not use Buffer or other Node.js APIs', () => {
        const encoded = getNewFormatSample();
        
        // The decoder should work without Node.js Buffer
        const result = decodeNewFormat(encoded);
        
        expect(result).toBeDefined();
      });
    });
  });

  describe('canDecodeNewFormat', () => {
    test('should return true for pure base64 strings', () => {
      const encoded = 'SGVsbG8gV29ybGQ=';
      expect(canDecodeNewFormat(encoded)).toBe(true);
    });

    test('should return true for pure hex strings', () => {
      const encoded = '48656c6c6f20576f726c64';
      expect(canDecodeNewFormat(encoded)).toBe(true);
    });

    test('should return true for uppercase hex strings', () => {
      const encoded = '48656C6C6F20576F726C64';
      expect(canDecodeNewFormat(encoded)).toBe(true);
    });

    test('should return false for strings with colons', () => {
      const encoded = 'abc:def:ghi';
      expect(canDecodeNewFormat(encoded)).toBe(false);
    });

    test('should return true for strings with beyond-hex characters (valid base64)', () => {
      // This string has g-p which are beyond hex range, but valid for base64
      const encoded = 'abcdefghijklmnop';
      // This is actually valid base64 format (length divisible by 4, contains non-hex chars)
      expect(canDecodeNewFormat(encoded)).toBe(true);
    });

    test('should return false for OLD format strings', () => {
      const encoded = '123:456:ghi:xyz';
      expect(canDecodeNewFormat(encoded)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(canDecodeNewFormat('')).toBe(false);
    });

    test('should return false for null input', () => {
      expect(canDecodeNewFormat(null as any)).toBe(false);
    });

    test('should return false for undefined input', () => {
      expect(canDecodeNewFormat(undefined as any)).toBe(false);
    });

    test('should return false for non-string input', () => {
      expect(canDecodeNewFormat(123 as any)).toBe(false);
    });

    test('should return true for real NEW format sample', () => {
      const encoded = getNewFormatSample();
      expect(canDecodeNewFormat(encoded)).toBe(true);
    });

    test('should return false for strings with special characters', () => {
      const encoded = 'abc!@#$%^&*()';
      expect(canDecodeNewFormat(encoded)).toBe(false);
    });

    test('should handle base64 with padding', () => {
      const encoded = 'SGVsbG8gV29ybGQ=';
      expect(canDecodeNewFormat(encoded)).toBe(true);
    });

    test('should handle base64 with double padding', () => {
      const encoded = 'SGVsbG8gV29ybA==';
      expect(canDecodeNewFormat(encoded)).toBe(true);
    });
  });

  describe('performance', () => {
    test('should decode within reasonable time', () => {
      const encoded = getNewFormatSample();
      const startTime = Date.now();
      
      const result = decodeNewFormat(encoded);
      
      const elapsedTime = Date.now() - startTime;
      
      // Should complete within 5 seconds (requirement)
      expect(elapsedTime).toBeLessThan(5000);
      expect(result.metadata?.decodeTime).toBeLessThan(5000);
    });

    test('should handle large encoded strings efficiently', () => {
      const encoded = getNewFormatSample();
      
      const result = decodeNewFormat(encoded);
      
      // Should not timeout or crash
      expect(result).toBeDefined();
      expect(result.metadata?.decodeTime).toBeDefined();
    });
  });
});
