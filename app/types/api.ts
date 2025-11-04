/**
 * API Types - Request/response models and error handling
 */

export interface APIError {
  code: string;
  message: string;
  statusCode: number;
  retryable: boolean;
}

export interface APIResponse<T> {
  data?: T;
  error?: APIError;
  cached?: boolean;
  timestamp: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RequestConfig {
  timeout?: number;
  retry?: RetryConfig;
  cache?: boolean;
  cacheTTL?: number;
}
