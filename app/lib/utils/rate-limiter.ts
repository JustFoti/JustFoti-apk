/**
 * Rate Limiter
 * Simple in-memory rate limiting for login attempts
 */

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
  lockedUntil?: number;
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly lockoutMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000, lockoutMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.lockoutMs = lockoutMs;
    
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if an identifier is rate limited
   */
  isRateLimited(identifier: string): boolean {
    const entry = this.attempts.get(identifier);
    
    if (!entry) return false;
    
    const now = Date.now();
    
    // Check if locked out
    if (entry.lockedUntil && now < entry.lockedUntil) {
      return true;
    }
    
    // Reset if window expired
    if (now > entry.resetAt) {
      this.attempts.delete(identifier);
      return false;
    }
    
    return entry.attempts >= this.maxAttempts;
  }

  /**
   * Record a failed attempt
   */
  recordAttempt(identifier: string): void {
    const now = Date.now();
    const entry = this.attempts.get(identifier);
    
    if (!entry || now > entry.resetAt) {
      // New window
      this.attempts.set(identifier, {
        attempts: 1,
        resetAt: now + this.windowMs,
      });
    } else {
      // Increment attempts
      entry.attempts++;
      
      // Lock out if max attempts reached
      if (entry.attempts >= this.maxAttempts) {
        entry.lockedUntil = now + this.lockoutMs;
      }
      
      this.attempts.set(identifier, entry);
    }
  }

  /**
   * Reset attempts for an identifier (e.g., after successful login)
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const entry = this.attempts.get(identifier);
    
    if (!entry) return this.maxAttempts;
    
    const now = Date.now();
    
    if (now > entry.resetAt) {
      return this.maxAttempts;
    }
    
    return Math.max(0, this.maxAttempts - entry.attempts);
  }

  /**
   * Get time until reset (in seconds)
   */
  getResetTime(identifier: string): number {
    const entry = this.attempts.get(identifier);
    
    if (!entry) return 0;
    
    const now = Date.now();
    const resetTime = entry.lockedUntil || entry.resetAt;
    
    return Math.max(0, Math.ceil((resetTime - now) / 1000));
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.attempts.forEach((entry, identifier) => {
      if (now > entry.resetAt && (!entry.lockedUntil || now > entry.lockedUntil)) {
        toDelete.push(identifier);
      }
    });
    
    toDelete.forEach(identifier => this.attempts.delete(identifier));
  }
}

// Singleton instance
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000, 15 * 60 * 1000);
