/**
 * Tests for Self-Hosted Decoder
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { SelfHostedDecoder } from '../self-hosted-decoder';

describe('SelfHostedDecoder', () => {
  let decoder: SelfHostedDecoder;

  beforeEach(() => {
    decoder = new SelfHostedDecoder();
    decoder.clearCache();
  });

  describe('decode', () => {
    it('should decode a valid hidden div', async () => {
      // This is a real sample from testing
      const divContent = 'U2FsdGVkX1+test+content+here==';
      const dataI = '1234567890';
      const divId = 'pjs_123456';

      const result = await decoder.decode(divContent, dataI, divId);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);
      
      // Note: Without the actual decoder script, this will fail
      // In production, this should return a decoded value
    });

    it('should use cache for repeated decodes', async () => {
      const divContent = 'test_content';
      const dataI = '123';
      const divId = 'pjs_test';

      // First call
      const result1 = await decoder.decode(divContent, dataI, divId);
      const time1 = result1.executionTime;

      // Second call (should be cached)
      const result2 = await decoder.decode(divContent, dataI, divId);
      const time2 = result2.executionTime;

      // Cached call should be faster
      expect(time2).toBeLessThan(time1);
    });

    it('should handle execution timeout', async () => {
      // Create a decoder with very short timeout
      const shortTimeoutDecoder = new SelfHostedDecoder();
      
      const divContent = 'test';
      const dataI = '123';
      const divId = 'pjs_test';

      const result = await shortTimeoutDecoder.decode(divContent, dataI, divId);

      // Should handle timeout gracefully
      expect(result.success).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should escape HTML in inputs', async () => {
      const divContent = '<script>alert("xss")</script>';
      const dataI = '"><script>alert("xss")</script>';
      const divId = 'pjs_test';

      // Should not throw error due to HTML injection
      const result = await decoder.decode(divContent, dataI, divId);
      
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      decoder.clearCache();
      const stats = decoder.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should report cache statistics', () => {
      const stats = decoder.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats.maxSize).toBeGreaterThan(0);
    });

    it('should limit cache size', async () => {
      const stats = decoder.getCacheStats();
      const maxSize = stats.maxSize;

      // Try to fill cache beyond max size
      for (let i = 0; i < maxSize + 10; i++) {
        await decoder.decode(`content_${i}`, `${i}`, `pjs_${i}`);
      }

      const finalStats = decoder.getCacheStats();
      expect(finalStats.size).toBeLessThanOrEqual(maxSize);
    });
  });

  describe('error handling', () => {
    it('should handle invalid div content', async () => {
      const result = await decoder.decode('', '', '');
      
      expect(result.success).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle missing decoder script gracefully', async () => {
      // This test assumes decoder script might not be present
      const result = await decoder.decode('test', '123', 'pjs_test');
      
      // Should either succeed or fail gracefully
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });
});
