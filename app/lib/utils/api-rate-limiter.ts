/**
 * API Rate Limiter
 * Rate limiting for API endpoints based on IP address
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class APIRateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check if a request should be allowed
   */
  checkLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetAt) {
      // New window
      const resetAt = now + this.windowMs;
      this.requests.set(identifier, {
        count: 1,
        resetAt,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt,
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.requests.forEach((entry, identifier) => {
      if (now > entry.resetAt) {
        toDelete.push(identifier);
      }
    });

    toDelete.forEach(identifier => this.requests.delete(identifier));
  }
}

// Create rate limiters for different endpoints
export const contentRateLimiter = new APIRateLimiter(100, 60 * 1000); // 100 requests per minute
export const searchRateLimiter = new APIRateLimiter(30, 60 * 1000);   // 30 requests per minute

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to a default (not ideal for production)
  return 'unknown';
}
