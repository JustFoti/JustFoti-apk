/**
 * Shared TypeScript types for RCP Decoders
 * 
 * This file contains all type definitions used across the decoder module.
 * Keep this file updated when adding new decoder methods or strategies.
 */

/**
 * Input parameters for decoding
 */
export interface DecodeInput {
  /** The encoded string to decode */
  encoded: string;
  
  /** The div ID used for XOR-based decoders (optional) */
  divId?: string;
  
  /** Additional data parameter (optional, rarely used) */
  dataI?: string;
  
  /** Request ID for logging and tracing */
  requestId?: string;
}

/**
 * Result from a successful decode operation
 */
export interface DecodeSuccess {
  /** Indicates successful decoding */
  success: true;
  
  /** The decoded M3U8 URL */
  url: string;
  
  /** Name of the decoder method that succeeded */
  method: string;
  
  /** Time taken to decode in milliseconds */
  elapsed?: number;
  
  /** Additional metadata */
  metadata?: {
    /** Number of methods tried before success */
    attemptCount?: number;
    
    /** Strategy used (fast-path, brute-force, puppeteer) */
    strategy?: 'fast-path' | 'brute-force' | 'puppeteer';
    
    /** Whether result was from cache */
    cached?: boolean;
  };
}

/**
 * Result from a failed decode operation
 */
export interface DecodeFailure {
  /** Indicates failed decoding */
  success: false;
  
  /** Error message describing why decoding failed */
  error: string;
  
  /** Time taken before failure in milliseconds */
  elapsed?: number;
  
  /** Additional error details */
  details?: {
    /** Number of methods attempted */
    methodsAttempted?: number;
    
    /** List of methods that were tried */
    methodsTried?: string[];
    
    /** Whether Puppeteer fallback was attempted */
    puppeteerAttempted?: boolean;
  };
}

/**
 * Union type for decode results
 */
export type DecodeResult = DecodeSuccess | DecodeFailure;

/**
 * Decoder function signature
 * 
 * All decoder methods must implement this interface
 */
export interface DecoderFunction {
  /**
   * Decode the input string
   * 
   * @param input - The encoded string
   * @param divId - Optional div ID for XOR-based decoders
   * @param dataI - Optional additional data parameter
   * @returns Decoded string or null if decoding failed
   */
  (input: string, divId?: string, dataI?: string): string | null;
}

/**
 * Decoder method metadata
 */
export interface DecoderMethod {
  /** Unique identifier for this decoder */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** The decoder function */
  fn: DecoderFunction;
  
  /** Category of decoder (for organization) */
  category: 'caesar' | 'base64' | 'hex' | 'xor' | 'substitution' | 'composite';
  
  /** Expected success rate (0-1) */
  successRate?: number;
  
  /** Average execution time in ms */
  avgTime?: number;
  
  /** Priority (lower = higher priority) */
  priority?: number;
  
  /** Whether this decoder requires divId */
  requiresDivId?: boolean;
  
  /** Whether this decoder requires dataI */
  requiresDataI?: boolean;
  
  /** Description of what this decoder does */
  description?: string;
}

/**
 * Decoder registry for managing all decoder methods
 */
export interface DecoderRegistry {
  /** Register a new decoder method */
  register(method: DecoderMethod): void;
  
  /** Get all registered decoders */
  getAll(): DecoderMethod[];
  
  /** Get decoders by category */
  getByCategory(category: DecoderMethod['category']): DecoderMethod[];
  
  /** Get decoders sorted by priority */
  getByPriority(): DecoderMethod[];
  
  /** Get decoder by ID */
  getById(id: string): DecoderMethod | undefined;
  
  /** Record a decode attempt */
  recordAttempt(id: string, success: boolean, time: number): void;
  
  /** Get statistics for a decoder */
  getStats(id: string): DecoderStats | undefined;
}

/**
 * Statistics for a decoder method
 */
export interface DecoderStats {
  /** Decoder ID */
  id: string;
  
  /** Total number of attempts */
  attempts: number;
  
  /** Number of successful decodes */
  successes: number;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Average execution time in ms */
  avgTime: number;
  
  /** Last used timestamp */
  lastUsed?: number;
}

/**
 * Configuration for decoder behavior
 */
export interface DecoderConfig {
  /** Timeout for fast path in ms */
  fastPathTimeout: number;
  
  /** Timeout for brute force in ms */
  bruteForceTimeout: number;
  
  /** Timeout for Puppeteer fallback in ms */
  puppeteerTimeout: number;
  
  /** Maximum depth for brute force combinations */
  maxBruteForceDepth: number;
  
  /** Enable result caching */
  enableCaching: boolean;
  
  /** Cache TTL in ms */
  cacheTTL: number;
  
  /** Enable debug logging */
  debug: boolean;
  
  /** Enable performance tracking */
  trackPerformance: boolean;
}

/**
 * Cache entry for decoded results
 */
export interface CacheEntry {
  /** The decoded URL */
  url: string;
  
  /** Method that was used */
  method: string;
  
  /** Timestamp when cached */
  timestamp: number;
  
  /** TTL in ms */
  ttl: number;
}

/**
 * Validation result for decoded URLs
 */
export interface ValidationResult {
  /** Whether the URL is valid */
  valid: boolean;
  
  /** Reason if invalid */
  reason?: string;
  
  /** The validated/cleaned URL */
  url?: string;
}

/**
 * Transform function for brute force decoder
 */
export interface TransformFunction {
  /** Name of the transform */
  name: string;
  
  /** The transform function */
  fn: (input: string) => string | null;
  
  /** Whether this transform is reversible */
  reversible?: boolean;
}

/**
 * Brute force path (sequence of transforms)
 */
export interface BruteForcePath {
  /** Sequence of transform names */
  transforms: string[];
  
  /** The final result */
  result: string;
  
  /** Whether this path succeeded */
  success: boolean;
}

/**
 * Performance metrics for decoder operations
 */
export interface PerformanceMetrics {
  /** Total decode operations */
  totalOperations: number;
  
  /** Successful operations */
  successfulOperations: number;
  
  /** Failed operations */
  failedOperations: number;
  
  /** Average time per operation in ms */
  avgTime: number;
  
  /** Min time in ms */
  minTime: number;
  
  /** Max time in ms */
  maxTime: number;
  
  /** Method distribution (method name -> count) */
  methodDistribution: Record<string, number>;
  
  /** Strategy distribution */
  strategyDistribution: {
    fastPath: number;
    bruteForce: number;
    puppeteer: number;
  };
}
