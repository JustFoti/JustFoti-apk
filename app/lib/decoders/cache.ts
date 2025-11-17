/**
 * Caching Layer for Decoder System
 * 
 * Provides in-memory caching for:
 * - Pattern detection results
 * - XOR keys for NEW format
 * - Decoded results
 * 
 * This improves performance by avoiding redundant computations.
 */

import { PatternType, DecoderResult } from './types';

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Generic LRU (Least Recently Used) Cache
 */
class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 1000, ttl: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    // Add new entry
    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl,
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;
    
    const entries = Array.from(this.cache.values());
    for (const entry of entries) {
      if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (newestTimestamp === null || entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp,
    };
  }
}

/**
 * Pattern detection cache
 * Caches pattern detection results to avoid redundant analysis
 */
class PatternDetectionCache {
  private cache: LRUCache<string, PatternType>;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 1000, ttl: number = 5 * 60 * 1000) {
    this.cache = new LRUCache(maxSize, ttl);
  }

  /**
   * Get cached pattern detection result
   */
  get(encodedString: string): PatternType | undefined {
    const result = this.cache.get(encodedString);
    
    if (result !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }
    
    return result;
  }

  /**
   * Cache pattern detection result
   */
  set(encodedString: string, pattern: PatternType): void {
    this.cache.set(encodedString, pattern);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cache.getStats(),
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
    };
  }

  /**
   * Clear cache and reset statistics
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * XOR key cache for NEW format decoder
 * Caches successful XOR keys to speed up decoding
 */
class XORKeyCache {
  private cache: LRUCache<string, string>;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 500, ttl: number = 10 * 60 * 1000) {
    this.cache = new LRUCache(maxSize, ttl);
  }

  /**
   * Get cached XOR key for an encoded string
   */
  get(encodedString: string): string | undefined {
    const result = this.cache.get(encodedString);
    
    if (result !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }
    
    return result;
  }

  /**
   * Cache successful XOR key
   */
  set(encodedString: string, key: string): void {
    this.cache.set(encodedString, key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cache.getStats(),
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
    };
  }

  /**
   * Clear cache and reset statistics
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * Decode result cache
 * Caches complete decode results for frequently accessed strings
 */
class DecodeResultCache {
  private cache: LRUCache<string, DecoderResult>;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 500, ttl: number = 5 * 60 * 1000) {
    this.cache = new LRUCache(maxSize, ttl);
  }

  /**
   * Get cached decode result
   */
  get(encodedString: string): DecoderResult | undefined {
    const result = this.cache.get(encodedString);
    
    if (result !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }
    
    return result;
  }

  /**
   * Cache decode result
   */
  set(encodedString: string, result: DecoderResult): void {
    // Only cache successful results
    if (result.success) {
      this.cache.set(encodedString, result);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cache.getStats(),
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
    };
  }

  /**
   * Clear cache and reset statistics
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * Global cache instances
 */
export const patternDetectionCache = new PatternDetectionCache();
export const xorKeyCache = new XORKeyCache();
export const decodeResultCache = new DecodeResultCache();

/**
 * Get statistics for all caches
 */
export function getAllCacheStats() {
  return {
    patternDetection: patternDetectionCache.getStats(),
    xorKey: xorKeyCache.getStats(),
    decodeResult: decodeResultCache.getStats(),
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  patternDetectionCache.clear();
  xorKeyCache.clear();
  decodeResultCache.clear();
}
