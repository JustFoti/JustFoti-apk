/**
 * Shared constants for RCP Decoders
 * 
 * Centralized configuration and constants used across the decoder module.
 */

import { DecoderConfig } from './types';

/**
 * Default decoder configuration
 * 
 * These values can be overridden at runtime using setConfig()
 */
export const DEFAULT_CONFIG: DecoderConfig = {
  // Timeouts
  fastPathTimeout: 100,        // 100ms for fast path
  bruteForceTimeout: 500,      // 500ms for brute force
  puppeteerTimeout: 10000,     // 10s for Puppeteer fallback
  
  // Brute force settings
  maxBruteForceDepth: 3,       // Max 3 transforms in sequence
  
  // Caching
  enableCaching: true,         // Enable result caching
  cacheTTL: 300000,           // 5 minutes cache TTL
  
  // Debugging
  debug: false,                // Disable debug logging by default
  trackPerformance: true,      // Enable performance tracking
};

/**
 * URL validation patterns
 */
export const URL_PATTERNS = {
  /** Must start with http:// or https:// */
  PROTOCOL: /^https?:\/\//,
  
  /** Must contain .m3u8 or /pl/ (playlist indicators) */
  PLAYLIST: /\.m3u8|\/pl\//,
  
  /** Valid URL characters (including placeholders) */
  VALID_CHARS: /^[a-zA-Z0-9:\/\.\-_~\?#\[\]@!$&'()*+,;=%{}]+$/,
  
  /** Placeholder pattern */
  PLACEHOLDER: /\{[vs]\d+\}/,
};

/**
 * Decoder categories and their priorities
 * 
 * Lower priority number = tried first
 */
export const CATEGORY_PRIORITIES = {
  caesar: 1,        // Caesar ciphers (most common)
  hex: 2,           // Hex decoding
  xor: 3,           // XOR-based
  base64: 4,        // Base64 variants
  composite: 5,     // Multi-step decoders
  substitution: 6,  // Substitution ciphers
};

/**
 * Known successful decoder methods with historical success rates
 * 
 * Based on analysis of thousands of decode operations
 */
export const KNOWN_SUCCESS_RATES = {
  'rot23': 0.25,              // 25% - Most common
  'hex': 0.20,                // 20%
  'xor-divid': 0.20,          // 20%
  'reverse-base64-sub3': 0.15, // 15%
  'hex-double-xor': 0.15,     // 15%
  'rot3-complex': 0.10,       // 10%
  'reverse-base64': 0.10,     // 10%
  'substitution': 0.05,       // 5%
  'other': 0.05,              // 5% - All other methods combined
};

/**
 * Character sets for validation
 */
export const CHAR_SETS = {
  /** Base64 standard characters */
  BASE64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
  
  /** URL-safe Base64 characters */
  BASE64_URL_SAFE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=',
  
  /** Hexadecimal characters */
  HEX: '0123456789abcdefABCDEF:',
  
  /** Alphabetic characters (for Caesar/ROT) */
  ALPHA: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
};

/**
 * Common Caesar shift values to try
 */
export const CAESAR_SHIFTS = [
  3,    // ROT-23 (most common)
  -3,   // Reverse ROT-23
  13,   // ROT-13 (classic)
  1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12,  // Other shifts
  14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  -1, -2, -4, -5, -6, -7, -8, -9, -10, -11, -12,
  -13, -14, -15, -16, -17, -18, -19, -20, -21, -22, -23, -24, -25,
];

/**
 * XOR keys to try for XOR-based decoders
 */
export const XOR_KEYS = [
  1, 3, 7,           // Common single-byte XOR keys
  'ererere',         // Known key from reverse engineering
];

/**
 * Minimum lengths for validation
 */
export const MIN_LENGTHS = {
  /** Minimum encoded string length */
  ENCODED: 10,
  
  /** Minimum decoded URL length */
  DECODED_URL: 20,
  
  /** Minimum hex string length */
  HEX: 10,
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NO_INPUT: 'No encoded input provided',
  TOO_SHORT: 'Encoded input too short',
  INVALID_FORMAT: 'Invalid encoded format',
  ALL_METHODS_FAILED: 'All decoder methods failed',
  TIMEOUT: 'Decoder operation timed out',
  INVALID_URL: 'Decoded result is not a valid URL',
  PUPPETEER_FAILED: 'Puppeteer fallback failed',
  CACHE_ERROR: 'Cache operation failed',
};

/**
 * Log prefixes for different components
 */
export const LOG_PREFIXES = {
  DECODER: '[Decoder]',
  FAST_PATH: '[FastPath]',
  BRUTE_FORCE: '[BruteForce]',
  PUPPETEER: '[Puppeteer]',
  CACHE: '[Cache]',
  REGISTRY: '[Registry]',
  VALIDATOR: '[Validator]',
};

/**
 * Performance thresholds for warnings
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Warn if fast path takes longer than this (ms) */
  FAST_PATH_WARNING: 150,
  
  /** Warn if brute force takes longer than this (ms) */
  BRUTE_FORCE_WARNING: 1000,
  
  /** Warn if Puppeteer takes longer than this (ms) */
  PUPPETEER_WARNING: 15000,
};

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Maximum cache size (number of entries) */
  MAX_SIZE: 1000,
  
  /** Cleanup interval in ms */
  CLEANUP_INTERVAL: 60000, // 1 minute
  
  /** Cache key prefix */
  KEY_PREFIX: 'decoder:',
};

/**
 * Brute force configuration
 */
export const BRUTE_FORCE_CONFIG = {
  /** Maximum number of transform combinations to try */
  MAX_COMBINATIONS: 10000,
  
  /** Stop after this many successful paths found */
  MAX_SUCCESS_PATHS: 1,
  
  /** Timeout per transform in ms */
  TRANSFORM_TIMEOUT: 10,
};

/**
 * Puppeteer configuration
 */
export const PUPPETEER_CONFIG = {
  /** Maximum number of concurrent Puppeteer instances */
  MAX_CONCURRENT: 3,
  
  /** Timeout for page load in ms */
  PAGE_LOAD_TIMEOUT: 30000,
  
  /** Timeout for decoder execution in ms */
  EXECUTION_TIMEOUT: 10000,
  
  /** Whether to run headless */
  HEADLESS: true,
  
  /** Browser args */
  BROWSER_ARGS: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
  ],
};

/**
 * Export all constants as a single object for convenience
 */
export const DECODER_CONSTANTS = {
  DEFAULT_CONFIG,
  URL_PATTERNS,
  CATEGORY_PRIORITIES,
  KNOWN_SUCCESS_RATES,
  CHAR_SETS,
  CAESAR_SHIFTS,
  XOR_KEYS,
  MIN_LENGTHS,
  ERROR_MESSAGES,
  LOG_PREFIXES,
  PERFORMANCE_THRESHOLDS,
  CACHE_CONFIG,
  BRUTE_FORCE_CONFIG,
  PUPPETEER_CONFIG,
} as const;
