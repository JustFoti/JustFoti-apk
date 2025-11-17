/**
 * Utility functions for the decoder system
 * 
 * Provides helper functions for URL validation, extraction, and decoder orchestration
 */

import { DecoderResult, PatternType } from './types';
import { decodeOldFormat } from './old-format-decoder';
import { decodeNewFormat } from './new-format-decoder';

/**
 * Validates if a URL is a valid m3u8 streaming URL
 * 
 * @param url - The URL to validate
 * @returns true if the URL is a valid m3u8 URL
 */
export function isValidM3u8Url(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Must be HTTP or HTTPS
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Must have a valid hostname (not just protocol)
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      return false;
    }
    
    // Should contain m3u8 in the path or be a valid streaming URL
    return url.includes('.m3u8') || 
           url.includes('/playlist') || 
           url.includes('/stream') ||
           url.includes('.mp4') ||
           url.includes('.ts');
  } catch {
    return false;
  }
}

/**
 * Extracts URLs from decoded content
 * Optimized for performance with better regex and Set-based deduplication
 * 
 * @param decoded - The decoded string content
 * @returns Array of extracted URLs
 */
export function extractUrls(decoded: string): string[] {
  if (!decoded) {
    return [];
  }
  
  // Optimized URL pattern - more specific to reduce backtracking
  const urlPattern = /https?:\/\/[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+/g;
  const matches = decoded.match(urlPattern);
  
  if (!matches) {
    return [];
  }
  
  // Use Set for faster duplicate removal
  const uniqueUrls = new Set<string>();
  
  for (const url of matches) {
    const trimmed = url.trim();
    if (trimmed.length > 0) {
      uniqueUrls.add(trimmed);
    }
  }
  
  return Array.from(uniqueUrls);
}

/**
 * Tries all available decoders on an encoded string
 * 
 * @param encoded - The encoded string to decode
 * @returns DecoderResult with the first successful decode or combined failure info
 */
export function tryAllDecoders(encoded: string): DecoderResult {
  const startTime = Date.now();
  const attemptedDecoders: string[] = [];
  const errors: string[] = [];
  
  // Try OLD format decoder
  try {
    attemptedDecoders.push('old-format-decoder');
    const result = decodeOldFormat(encoded);
    if (result.success) {
      return {
        ...result,
        metadata: {
          decodeTime: Date.now() - startTime,
          attemptedDecoders
        }
      };
    }
    if (result.error) {
      errors.push(`old-format-decoder: ${result.error}`);
    }
  } catch (error) {
    errors.push(`old-format-decoder: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Try NEW format decoder
  try {
    attemptedDecoders.push('new-format-decoder');
    const result = decodeNewFormat(encoded);
    if (result.success) {
      return {
        ...result,
        metadata: {
          decodeTime: Date.now() - startTime,
          attemptedDecoders
        }
      };
    }
    if (result.error) {
      errors.push(`new-format-decoder: ${result.error}`);
    }
  } catch (error) {
    errors.push(`new-format-decoder: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // All decoders failed
  const decodeTime = Date.now() - startTime;
  return {
    success: false,
    urls: [],
    pattern: PatternType.UNKNOWN,
    error: `All decoders failed. Errors: ${errors.join('; ')}`,
    metadata: {
      decodeTime,
      attemptedDecoders
    }
  };
}

/**
 * Logs diagnostic information for debugging
 * 
 * @param message - The log message
 * @param context - Additional context information
 */
export function logDiagnostic(message: string, context?: Record<string, unknown>): void {
  if (typeof console !== 'undefined' && console.log) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      ...context
    };
    console.log('[Decoder Diagnostic]', JSON.stringify(logEntry, null, 2));
  }
}

/**
 * Validates and filters URLs to only include valid streaming URLs
 * 
 * @param urls - Array of URLs to validate
 * @returns Array of valid streaming URLs
 */
export function validateUrls(urls: string[]): string[] {
  if (!urls || !Array.isArray(urls)) {
    return [];
  }
  
  return urls.filter(url => isValidM3u8Url(url));
}
