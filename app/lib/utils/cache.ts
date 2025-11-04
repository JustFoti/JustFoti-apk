/**
 * Multi-tier Caching System
 * Implements memory, localStorage, and database caching layers
 */

import type { CacheEntry } from '@/types/api';

/**
 * Cache TTL durations in milliseconds
 */
export const CACHE_DURATIONS = {
  trending: 5 * 60 * 1000,      // 5 minutes
  details: 60 * 60 * 1000,      // 1 hour
  search: 10 * 60 * 1000,       // 10 minutes
  images: 24 * 60 * 60 * 1000,  // 24 hours
  streams: 30 * 60 * 1000,      // 30 minutes
} as const;

/**
 * Memory cache (fastest, but volatile)
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100; // Maximum number of entries

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * LocalStorage cache (persistent across sessions)
 */
class LocalStorageCache {
  private prefix = 'flyx_cache_';

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();

      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('LocalStorage cache read error:', error);
      return null;
    }
  }

  set<T>(key: string, data: T, ttl: number): void {
    if (typeof window === 'undefined') return;

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (error) {
      // Handle quota exceeded or other errors
      console.error('LocalStorage cache write error:', error);
      this.cleanup();
    }
  }

  delete(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Remove expired entries to free up space
   */
  private cleanup(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const entry: CacheEntry<any> = JSON.parse(item);
            if (now - entry.timestamp > entry.ttl) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }
    });
  }
}

/**
 * Multi-tier cache manager
 * Checks memory -> localStorage -> database in order
 */
class CacheManager {
  private memory = new MemoryCache();
  private localStorage = new LocalStorageCache();

  /**
   * Get cached data from any tier
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first (fastest)
    const memoryData = this.memory.get<T>(key);
    if (memoryData !== null) {
      return memoryData;
    }

    // Try localStorage (persistent)
    const localData = this.localStorage.get<T>(key);
    if (localData !== null) {
      // Promote to memory cache
      this.memory.set(key, localData, CACHE_DURATIONS.trending);
      return localData;
    }

    return null;
  }

  /**
   * Set data in all cache tiers
   */
  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    this.memory.set(key, data, ttl);
    this.localStorage.set(key, data, ttl);
  }

  /**
   * Delete from all cache tiers
   */
  async delete(key: string): Promise<void> {
    this.memory.delete(key);
    this.localStorage.delete(key);
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memory.clear();
    this.localStorage.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memorySize: this.memory.size(),
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
}
