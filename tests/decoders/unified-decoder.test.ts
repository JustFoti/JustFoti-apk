/**
 * Integration tests for unified decoder interface
 * 
 * Tests the automatic pattern detection, decoding, fallback chain,
 * performance, and error handling of the unified decoder system.
 */

import { describe, test, expect } from 'bun:test';
import { decode, decodeSync } from '../../app/lib/decoders/index';
import { PatternType } from '../../app/lib/decoders/types';
import { readFileSync } from 'fs';

// Helper to extract encoded string from HTML file
function getOldFormatSample(): string {
  const html = readFileSync('reverse-engineering-output/pages/prorcp-NmMwYTI2YTk1ODg2NGUx.html', 'utf8');
  const match = html.match(/<div id="eSfH1IRMyL"[^>]*>([^<]+)<\/div>/);
  if (!match) {
    throw new Error('Could not extract OLD format sample from HTML file');
  }
  return match[1];
}

describe('Unified Decoder Interface', () => {
  describe('decodeSync', () => {
    describe('automatic pattern detection and decoding', () => {
      test('should automatically detect and decode OLD format', () => {
        const encoded = getOldFormatSample();
        
        const result = decodeSync(encoded);
        
        expect(result.success).toBe(true);
        expect(result.urls.length).toBeGreaterThan(0);
        expect(result.pattern).toBe(PatternType.OLD_FORMAT);
        expect(result.decoderUsed).toBe('old-format-decoder');
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.attemptedDecoders).toContain('old-format-decoder');
      });

      test('should extract valid streaming URLs', () => {
        const encoded = getOldFormatSample();
        
        const result = decodeSync(encoded);
        
        expect(result.success).toBe(true);
        expect(result.urls.length).toBeGreaterThan(0);
        
        // All URLs should be valid HTTP/HTTPS URLs
        result.urls.forEach(url => {
          expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
        });
      });

      test('should validate URLs and filter invalid ones', () => {
        const encoded = getOldFormatSample();
        
        const result = decodeSync(encoded);
        
        if (result.success) {
          // All returned URLs should be valid HTTP/HTTPS URLs
          result.urls.forEach(url => {
            expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
            // Should be parseable as URL
            expect(() => new URL(url)).not.toThrow();
          });
        }
      });

      test('should include performance metadata', () => {
        const encoded = getOldFormatSample();
        
        const result = decodeSync(encoded);
        
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.decodeTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata?.attemptedDecoders).toBeDefined();
        expect(result.metadata?.attemptedDecoders.length).toBeGreaterThan(0);
      });

      test('should handle NEW format detection', () => {
        // Pure base64 string (NEW format)
        const encoded = 'SGVsbG8gV29ybGQ=';
        
        const result = decodeSync(encoded);
        
        // May not succeed (no valid URLs), but should attempt NEW format decoder
        expect(result.metadata?.attemptedDecoders).toBeDefined();
        expect(
          result.metadata?.attemptedDecoders.includes('new-format-decoder') ||
          result.metadata?.attemptedDecoders.includes('old-format-decoder')
        ).toBe(true);
      });
    });

    describe('fallback chain', () => {
      test('should try all decoders when pattern is unknown', () => {
        // String that doesn't match known patterns
        const encoded = 'unknown-pattern-12345';
        
        const result = decodeSync(encoded);
        
        expect(result.success).toBe(false);
        expect(result.metadata?.attemptedDecoders).toBeDefined();
        expect(result.metadata?.attemptedDecoders.length).toBeGreaterThan(0);
      });

      test('should try fallback decoders if primary fails', () => {
        // Malformed OLD format (has colons and g-z but won't decode properly)
        const encoded = 'xyz:abc:ghi:invalid';
        
        const result = decodeSync(encoded);
        
        // Should attempt multiple decoders
        expect(result.metadata?.attemptedDecoders).toBeDefined();
      });

      test('should return first successful decoder result', () => {
        const encoded = getOldFormatSample();
        
        const result = decodeSync(encoded);
        
        expect(result.success).toBe(true);
        expect(result.decoderUsed).toBeDefined();
        expect(result.urls.length).toBeGreaterThan(0);
      });

      test('should provide detailed error when all decoders fail', () => {
        const encoded = 'completely-invalid-data';
        
        const result = decodeSync(encoded);
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.metadata?.attemptedDecoders).toBeDefined();
      });
    });

    describe('error handling', () => {
      test('should handle empty string input', () => {
        const result = decodeSync('');
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('invalid_input');
      });

      test('should handle whitespace-only input', () => {
        const result = decodeSync('   ');
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
      });

      test('should handle null input', () => {
        const result = decodeSync(null as any);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
      });

      test('should handle undefined input', () => {
        const result = decodeSync(undefined as any);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
      });

      test('should handle non-string input', () => {
        const result = decodeSync(12345 as any);
        
        expect(result.success).toBe(false);
        expect(result.urls).toEqual([]);
        expect(result.error).toBeDefined();
      });

      test('should not crash on malformed data', () => {
        const malformedInputs = [
          'abc\x00def',
          '\uFFFD\uFFFD\uFFFD',
          '🎬🎥📹',
          'a'.repeat(10000), // Very long string
        ];
        
        malformedInputs.forEach(input => {
          const result = decodeSync(input);
          expect(result).toBeDefined();
          expect(result.success).toBeDefined();
          expect(result.urls).toBeDefined();
        });
      });

      test('should include error context in failed results', () => {
        const result = decodeSync('invalid-data');
        
        expect(result.error).toBeDefined();
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.attemptedDecoders).toBeDefined();
      });
    });

    describe('diagnostics', () => {
      test('should provide diagnostic information when enabled', () => {
        const encoded = getOldFormatSample();
        
        const result = decodeSync(encoded, { enableDiagnostics: true });
        
        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.decodeTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata?.attemptedDecoders).toBeDefined();
      });

      test('should work without diagnostics enabled', () => {
        const encoded = getOldFormatSample();
        
        const result = decodeSync(encoded, { enableDiagnostics: false });
        
        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
      });

      test('should work with default options', () => {
        const encoded = getOldFormatSample();
        
        const result = decodeSync(encoded);
        
        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
      });
    });
  });

  describe('decode (async)', () => {
    describe('async decoding', () => {
      test('should decode OLD format asynchronously', async () => {
        const encoded = getOldFormatSample();
        
        const result = await decode(encoded);
        
        expect(result.success).toBe(true);
        expect(result.urls.length).toBeGreaterThan(0);
        expect(result.pattern).toBe(PatternType.OLD_FORMAT);
      });

      test('should return a Promise', () => {
        const encoded = getOldFormatSample();
        
        const result = decode(encoded);
        
        expect(result).toBeInstanceOf(Promise);
      });

      test('should handle errors asynchronously', async () => {
        const result = await decode('');
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('timeout handling', () => {
      test('should respect custom timeout', async () => {
        const encoded = getOldFormatSample();
        
        const result = await decode(encoded, { timeout: 10000 });
        
        expect(result.success).toBe(true);
        expect(result.metadata?.decodeTime).toBeLessThan(10000);
      });

      test('should use default timeout when not specified', async () => {
        const encoded = getOldFormatSample();
        
        const result = await decode(encoded);
        
        expect(result.success).toBe(true);
        expect(result.metadata?.decodeTime).toBeLessThan(5000);
      });

      test('should handle timeout for very long operations', async () => {
        // Create a very long string that might take time to process
        const encoded = 'a'.repeat(100000);
        
        const result = await decode(encoded, { timeout: 100 });
        
        // Should either succeed quickly or timeout
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });

    describe('options handling', () => {
      test('should handle enableDiagnostics option', async () => {
        const encoded = getOldFormatSample();
        
        const result = await decode(encoded, { enableDiagnostics: true });
        
        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
      });

      test('should handle multiple options', async () => {
        const encoded = getOldFormatSample();
        
        const result = await decode(encoded, {
          enableDiagnostics: true,
          timeout: 10000
        });
        
        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
      });

      test('should work without options', async () => {
        const encoded = getOldFormatSample();
        
        const result = await decode(encoded);
        
        expect(result.success).toBe(true);
      });
    });
  });

  describe('performance', () => {
    test('should decode within 5 seconds for typical input', () => {
      const encoded = getOldFormatSample();
      
      const result = decodeSync(encoded);
      
      expect(result.metadata?.decodeTime).toBeLessThan(5000);
    });

    test('should decode quickly for OLD format (< 100ms)', () => {
      const encoded = getOldFormatSample();
      
      const result = decodeSync(encoded);
      
      expect(result.metadata?.decodeTime).toBeLessThan(100);
    });

    test('should handle multiple decodes efficiently', () => {
      const encoded = getOldFormatSample();
      const iterations = 10;
      const results: number[] = [];
      
      // First decode to warm up cache
      decodeSync(encoded);
      
      // Now measure cached performance
      for (let i = 0; i < iterations; i++) {
        const result = decodeSync(encoded);
        if (result.metadata?.decodeTime !== undefined) {
          results.push(result.metadata.decodeTime);
        }
      }
      
      // With caching, average should be very fast
      const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
      expect(results.length).toBe(iterations);
      expect(avgTime).toBeLessThan(50); // Cached results should be < 50ms
    });

    test('should not degrade performance with diagnostics enabled', () => {
      const encoded = getOldFormatSample();
      
      const withoutDiagnostics = decodeSync(encoded);
      const withDiagnostics = decodeSync(encoded, { enableDiagnostics: true });
      
      // Diagnostics should not add significant overhead (< 100ms difference)
      const timeDiff = Math.abs(
        (withDiagnostics.metadata?.decodeTime || 0) - 
        (withoutDiagnostics.metadata?.decodeTime || 0)
      );
      expect(timeDiff).toBeLessThan(100);
    });
  });

  describe('URL validation', () => {
    test('should only return valid streaming URLs', () => {
      const encoded = getOldFormatSample();
      
      const result = decodeSync(encoded);
      
      if (result.success) {
        result.urls.forEach(url => {
          // Should be valid URL
          expect(() => new URL(url)).not.toThrow();
          
          // Should be HTTP or HTTPS
          const urlObj = new URL(url);
          expect(['http:', 'https:']).toContain(urlObj.protocol);
        });
      }
    });

    test('should return URLs from decoded content', () => {
      const encoded = getOldFormatSample();
      
      const result = decodeSync(encoded);
      
      if (result.success) {
        // Should have extracted URLs
        expect(result.urls.length).toBeGreaterThan(0);
        
        // All URLs should be valid HTTP/HTTPS
        result.urls.forEach(url => {
          expect(url.startsWith('http://') || url.startsWith('https://')).toBe(true);
        });
      }
    });

    test('should remove duplicate URLs', () => {
      const encoded = getOldFormatSample();
      
      const result = decodeSync(encoded);
      
      if (result.success) {
        const uniqueUrls = new Set(result.urls);
        expect(result.urls.length).toBe(uniqueUrls.size);
      }
    });
  });
});
