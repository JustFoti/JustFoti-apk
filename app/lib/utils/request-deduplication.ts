/**
 * Request Deduplication Utility
 * 
 * Prevents duplicate API requests by caching in-flight requests
 * and returning the same promise for identical requests.
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private readonly maxAge: number = 5000; // 5 seconds

  /**
   * Deduplicate a request by key
   * If a request with the same key is already in flight, return that promise
   * Otherwise, execute the request function and cache the promise
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: { maxAge?: number } = {}
  ): Promise<T> {
    const maxAge = options.maxAge ?? this.maxAge;
    const now = Date.now();

    // Check if we have a pending request
    const pending = this.pendingRequests.get(key);
    if (pending && now - pending.timestamp < maxAge) {
      return pending.promise;
    }

    // Create new request
    const promise = requestFn()
      .then((result) => {
        // Clean up after successful completion
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Clean up after error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: now,
    });

    return promise;
  }

  /**
   * Clear a specific request from the cache
   */
  clear(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }

  /**
   * Clean up old pending requests
   */
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.pendingRequests.entries());
    for (const [key, request] of entries) {
      if (now - request.timestamp > this.maxAge) {
        this.pendingRequests.delete(key);
      }
    }
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Hook for using request deduplication in React components
 */
export function useDeduplicate() {
  return {
    deduplicate: requestDeduplicator.deduplicate.bind(requestDeduplicator),
    clear: requestDeduplicator.clear.bind(requestDeduplicator),
    clearAll: requestDeduplicator.clearAll.bind(requestDeduplicator),
  };
}

/**
 * Generate a cache key from request parameters
 */
export function generateRequestKey(
  endpoint: string,
  params?: Record<string, any>
): string {
  if (!params) return endpoint;
  
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return `${endpoint}?${sortedParams}`;
}
