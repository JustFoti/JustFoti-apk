/**
 * Stale-While-Revalidate Caching Strategy
 * Returns cached data immediately while fetching fresh data in background
 */

import { CacheEntry } from '@/types/api';

interface SWRConfig {
  ttl: number; // Time to live in milliseconds
  staleTime: number; // Time before data is considered stale
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
}

interface SWRCacheEntry<T> extends CacheEntry<T> {
  isStale: boolean;
  revalidating: boolean;
}

type RevalidateCallback<T> = (data: T) => void;

class SWRCache {
  private cache: Map<string, SWRCacheEntry<any>> = new Map();
  private revalidateCallbacks: Map<string, Set<RevalidateCallback<any>>> = new Map();
  private inflight: Map<string, Promise<any>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupListeners();
    }
  }

  private setupListeners() {
    // Revalidate on focus
    window.addEventListener('focus', () => {
      this.revalidateAll({ onFocus: true });
    });

    // Revalidate on reconnect
    window.addEventListener('online', () => {
      this.revalidateAll({ onReconnect: true });
    });
  }

  /**
   * Get data with SWR strategy
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: SWRConfig
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Return cached data if fresh
    if (cached && !this.isExpired(cached, now)) {
      // Mark as stale if needed
      if (this.isStale(cached, now, config.staleTime)) {
        cached.isStale = true;
        this.revalidate(key, fetcher, config);
      }
      return cached.data;
    }

    // Check if already fetching
    const inflightRequest = this.inflight.get(key);
    if (inflightRequest) {
      return inflightRequest;
    }

    // Fetch fresh data
    const fetchPromise = this.fetchAndCache(key, fetcher, config);
    this.inflight.set(key, fetchPromise);

    try {
      const data = await fetchPromise;
      return data;
    } finally {
      this.inflight.delete(key);
    }
  }

  /**
   * Fetch data and update cache
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: SWRConfig
  ): Promise<T> {
    try {
      const data = await fetcher();
      const now = Date.now();

      const entry: SWRCacheEntry<T> = {
        data,
        timestamp: now,
        ttl: config.ttl,
        isStale: false,
        revalidating: false,
      };

      this.cache.set(key, entry);
      this.notifyRevalidate(key, data);

      return data;
    } catch (error) {
      // Return stale data if available on error
      const cached = this.cache.get(key);
      if (cached) {
        console.warn(`Fetch failed for ${key}, returning stale data`, error);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Revalidate data in background
   */
  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: SWRConfig
  ): Promise<void> {
    const cached = this.cache.get(key);
    if (!cached || cached.revalidating) {
      return;
    }

    cached.revalidating = true;

    try {
      const data = await fetcher();
      const now = Date.now();

      const entry: SWRCacheEntry<T> = {
        data,
        timestamp: now,
        ttl: config.ttl,
        isStale: false,
        revalidating: false,
      };

      this.cache.set(key, entry);
      this.notifyRevalidate(key, data);
    } catch (error) {
      console.error(`Revalidation failed for ${key}`, error);
      if (cached) {
        cached.revalidating = false;
      }
    }
  }

  /**
   * Subscribe to revalidation updates
   */
  subscribe<T>(key: string, callback: RevalidateCallback<T>): () => void {
    if (!this.revalidateCallbacks.has(key)) {
      this.revalidateCallbacks.set(key, new Set());
    }
    
    const callbacks = this.revalidateCallbacks.get(key)!;
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.revalidateCallbacks.delete(key);
      }
    };
  }

  /**
   * Notify subscribers of revalidation
   */
  private notifyRevalidate<T>(key: string, data: T) {
    const callbacks = this.revalidateCallbacks.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: SWRCacheEntry<any>, now: number): boolean {
    return now - entry.timestamp > entry.ttl;
  }

  /**
   * Check if cache entry is stale
   */
  private isStale(entry: SWRCacheEntry<any>, now: number, staleTime: number): boolean {
    return now - entry.timestamp > staleTime;
  }

  /**
   * Revalidate all stale entries
   */
  private revalidateAll(_options: { onFocus?: boolean; onReconnect?: boolean }) {
    // This would be implemented based on config flags
    // For now, we'll skip to avoid unnecessary revalidations
  }

  /**
   * Manually invalidate a cache entry
   */
  invalidate(key: string) {
    this.cache.delete(key);
    this.inflight.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.inflight.clear();
    this.revalidateCallbacks.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const swrCache = new SWRCache();

/**
 * React hook for SWR data fetching
 */
export function useSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  config: Partial<SWRConfig> = {}
) {
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isValidating, setIsValidating] = React.useState(false);

  const fullConfig: SWRConfig = {
    ttl: config.ttl || 5 * 60 * 1000, // 5 minutes
    staleTime: config.staleTime || 60 * 1000, // 1 minute
    revalidateOnFocus: config.revalidateOnFocus ?? true,
    revalidateOnReconnect: config.revalidateOnReconnect ?? true,
  };

  React.useEffect(() => {
    if (!key) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsValidating(true);
        const result = await swrCache.get(key, fetcher, fullConfig);
        
        if (!cancelled) {
          setData(result);
          setError(undefined);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setIsLoading(false);
        }
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    };

    fetchData();

    // Subscribe to revalidation updates
    const unsubscribe = swrCache.subscribe(key, (newData: T) => {
      if (!cancelled) {
        setData(newData);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [key]);

  const mutate = React.useCallback(
    (newData?: T) => {
      if (key) {
        if (newData !== undefined) {
          setData(newData);
        }
        swrCache.invalidate(key);
      }
    },
    [key]
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

// Import React
import React from 'react';
