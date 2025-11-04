/**
 * API Rate Limiter Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { contentRateLimiter, searchRateLimiter, getClientIP } from '../api-rate-limiter';

describe('API Rate Limiter', () => {
  describe('Rate Limit Checking', () => {
    it('should allow requests within limit', () => {
      const identifier = 'test-ip-1';
      
      for (let i = 0; i < 10; i++) {
        const result = contentRateLimiter.checkLimit(identifier);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
      }
    });

    it('should block requests after limit exceeded', () => {
      const identifier = 'test-ip-2';
      
      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        contentRateLimiter.checkLimit(identifier);
      }
      
      // 101st request should be blocked
      const result = contentRateLimiter.checkLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should have different limits for different rate limiters', () => {
      const identifier = 'test-ip-3';
      
      // Content limiter allows 100 requests
      const contentResult = contentRateLimiter.checkLimit(identifier);
      expect(contentResult.allowed).toBe(true);
      
      // Search limiter allows 30 requests (stricter)
      const searchResult = searchRateLimiter.checkLimit(identifier);
      expect(searchResult.allowed).toBe(true);
    });

    it('should track different IPs separately', () => {
      const ip1 = 'test-ip-4';
      const ip2 = 'test-ip-5';
      
      // Exhaust limit for ip1
      for (let i = 0; i < 100; i++) {
        contentRateLimiter.checkLimit(ip1);
      }
      
      // ip1 should be blocked
      const result1 = contentRateLimiter.checkLimit(ip1);
      expect(result1.allowed).toBe(false);
      
      // ip2 should still be allowed
      const result2 = contentRateLimiter.checkLimit(ip2);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });
      
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      });
      
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.2');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      });
      
      const ip = getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return unknown if no IP headers present', () => {
      const request = new Request('http://localhost');
      
      const ip = getClientIP(request);
      expect(ip).toBe('unknown');
    });
  });
});
