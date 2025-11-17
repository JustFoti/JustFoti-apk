/**
 * Shared utility functions for RCP Decoders
 * 
 * Common helper functions used across decoder methods and strategies.
 */

import { URL_PATTERNS, MIN_LENGTHS } from './constants';
import { ValidationResult } from './types';

/**
 * Validate if a string is a valid M3U8 URL or contains placeholders
 * 
 * @param str - String to validate
 * @returns Validation result with details
 */
export function validateUrl(str: string | null): ValidationResult {
  if (!str || typeof str !== 'string') {
    return { valid: false, reason: 'Empty or invalid input' };
  }

  // Check minimum length
  if (str.length < MIN_LENGTHS.DECODED_URL) {
    return { valid: false, reason: 'URL too short' };
  }

  // Must start with http:// or https:// OR contain placeholders
  const hasProtocol = URL_PATTERNS.PROTOCOL.test(str);
  const hasPlaceholder = URL_PATTERNS.PLACEHOLDER.test(str);

  if (!hasProtocol && !hasPlaceholder) {
    return { valid: false, reason: 'Missing protocol or placeholder' };
  }

  // Must be printable ASCII (no garbage UTF-8 characters)
  if (!URL_PATTERNS.VALID_CHARS.test(str)) {
    return { valid: false, reason: 'Contains invalid characters' };
  }

  // Must contain .m3u8 or /pl/ (playlist indicators)
  if (!URL_PATTERNS.PLAYLIST.test(str)) {
    return { valid: false, reason: 'Not a playlist URL' };
  }

  return { valid: true, url: str };
}

/**
 * Check if string is valid Base64
 * 
 * @param str - String to check
 * @param urlSafe - Whether to check for URL-safe Base64
 * @returns true if valid Base64
 */
export function isValidBase64(str: string, urlSafe: boolean = false): boolean {
  if (!str || str.length === 0) return false;

  const pattern = urlSafe
    ? /^[A-Za-z0-9\-_]+=*$/
    : /^[A-Za-z0-9+/]+=*$/;

  // Check if all characters are valid
  if (!pattern.test(str)) return false;

  // Check padding
  const paddingCount = (str.match(/=/g) || []).length;
  if (paddingCount > 2) return false;

  // Try to decode
  try {
    const fixed = urlSafe
      ? str.replace(/-/g, '+').replace(/_/g, '/')
      : str;
    Buffer.from(fixed, 'base64');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string is valid hexadecimal
 * 
 * @param str - String to check
 * @returns true if valid hex
 */
export function isValidHex(str: string): boolean {
  if (!str || str.length === 0) return false;

  // Remove colons (common in hex strings)
  const cleaned = str.replace(/:/g, '');

  // Must be even length
  if (cleaned.length % 2 !== 0) return false;

  // Must be at least minimum length
  if (cleaned.length < MIN_LENGTHS.HEX) return false;

  // Must contain only hex characters
  return /^[0-9a-fA-F]+$/.test(cleaned);
}

/**
 * Safe string decode - handles errors gracefully
 * 
 * @param fn - Decoder function to execute
 * @param input - Input string
 * @param args - Additional arguments
 * @returns Decoded string or null on error
 */
export function safeDecode<T extends any[]>(
  fn: (input: string, ...args: T) => string,
  input: string,
  ...args: T
): string | null {
  try {
    const result = fn(input, ...args);
    return result || null;
  } catch (error) {
    return null;
  }
}

/**
 * Clean encoded string - remove common artifacts
 * 
 * @param str - String to clean
 * @returns Cleaned string
 */
export function cleanEncoded(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, '') // Remove whitespace
    .replace(/\n/g, '')  // Remove newlines
    .replace(/\r/g, ''); // Remove carriage returns
}

/**
 * Split URL on " or " separator and return first URL
 * 
 * Some decoded results contain multiple URLs separated by " or "
 * 
 * @param str - String that may contain multiple URLs
 * @returns First URL
 */
export function extractFirstUrl(str: string): string {
  if (str.includes(' or ')) {
    const parts = str.split(' or ');
    return parts[0].trim();
  }
  return str;
}

/**
 * Generate cache key from input parameters
 * 
 * @param encoded - Encoded string
 * @param divId - Div ID
 * @param dataI - Data I parameter
 * @returns Cache key
 */
export function generateCacheKey(
  encoded: string,
  divId: string = '',
  dataI: string = ''
): string {
  // Use first 100 chars of encoded + divId + dataI
  const key = `${encoded.substring(0, 100)}_${divId}_${dataI}`;
  return key;
}

/**
 * Measure execution time of a function
 * 
 * @param fn - Function to measure
 * @returns Tuple of [result, elapsed time in ms]
 */
export async function measureTime<T>(
  fn: () => T | Promise<T>
): Promise<[T, number]> {
  const start = Date.now();
  const result = await fn();
  const elapsed = Date.now() - start;
  return [result, elapsed];
}

/**
 * Create a timeout promise
 * 
 * @param ms - Timeout in milliseconds
 * @returns Promise that rejects after timeout
 */
export function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });
}

/**
 * Race a promise against a timeout
 * 
 * @param promise - Promise to race
 * @param ms - Timeout in milliseconds
 * @returns Promise result or timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  return Promise.race([promise, timeout(ms)]);
}

/**
 * Chunk an array into smaller arrays
 * 
 * @param array - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deduplicate array while preserving order
 * 
 * @param array - Array to deduplicate
 * @returns Deduplicated array
 */
export function deduplicate<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Check if string contains only printable ASCII characters
 * 
 * @param str - String to check
 * @returns true if only printable ASCII
 */
export function isPrintableAscii(str: string): boolean {
  return /^[\x20-\x7E]*$/.test(str);
}

/**
 * Calculate success rate from attempts and successes
 * 
 * @param successes - Number of successes
 * @param attempts - Total attempts
 * @returns Success rate (0-1)
 */
export function calculateSuccessRate(
  successes: number,
  attempts: number
): number {
  if (attempts === 0) return 0;
  return successes / attempts;
}

/**
 * Format elapsed time for logging
 * 
 * @param ms - Time in milliseconds
 * @returns Formatted string
 */
export function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Truncate string for logging
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Deep clone an object
 * 
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if code is running in Node.js environment
 * 
 * @returns true if Node.js
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' &&
         process.versions != null &&
         process.versions.node != null;
}

/**
 * Check if code is running in browser environment
 * 
 * @returns true if browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' &&
         typeof window.document !== 'undefined';
}

/**
 * Safe JSON parse with fallback
 * 
 * @param str - JSON string
 * @param fallback - Fallback value
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in ms
 * @returns Function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
