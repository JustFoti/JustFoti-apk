/**
 * Unified Decoder Interface
 * 
 * Provides a single entry point for decoding obfuscated strings.
 * Automatically detects the obfuscation pattern and applies the appropriate decoder.
 * Implements fallback chain to try all decoders if the primary one fails.
 */

import { DecoderResult, PatternType } from './types';
import { detectPattern } from './pattern-detector';
import { decodeOldFormat } from './old-format-decoder';
import { decodeNewFormat } from './new-format-decoder';
import { tryAllDecoders, logDiagnostic } from './utils';
import {
  createInvalidInputError,
  createDecodeFailedError,
  logDecoderError,
  logDecodeAttempt,
  formatErrorMessage
} from './error-handler';
import { saveFailedDecode } from './pattern-storage';
import { decodeResultCache } from './cache';
import { recordDecodeMetrics } from './performance';

/**
 * Decodes an obfuscated string and extracts m3u8 URLs
 * 
 * This is the main entry point for the decoder system. It:
 * 1. Automatically detects the obfuscation pattern
 * 2. Applies the appropriate decoder
 * 3. Falls back to trying all decoders if the primary one fails
 * 4. Validates extracted URLs
 * 5. Provides detailed diagnostics and performance tracking
 * 
 * @param encodedString - The obfuscated string to decode
 * @param options - Optional configuration
 * @returns Promise<DecoderResult> with success status, URLs, and metadata
 */
export async function decode(
  encodedString: string,
  options?: {
    enableDiagnostics?: boolean;
    timeout?: number;
  }
): Promise<DecoderResult> {
  const startTime = Date.now();
  const enableDiagnostics = options?.enableDiagnostics ?? false;
  const timeout = options?.timeout ?? 5000; // 5 seconds default
  
  try {
    // Validate input
    if (!encodedString || typeof encodedString !== 'string' || encodedString.trim().length === 0) {
      const error = createInvalidInputError(
        'Encoded string must be a non-empty string',
        encodedString
      );
      
      logDecoderError(error, { function: 'decode' });
      
      const result: DecoderResult = {
        success: false,
        urls: [],
        error: formatErrorMessage(error),
        metadata: {
          decodeTime: Date.now() - startTime,
          attemptedDecoders: []
        }
      };
      
      if (enableDiagnostics) {
        logDiagnostic('Decode failed: invalid input', { encodedString });
      }
      
      return result;
    }
    
    // Create timeout promise
    const timeoutPromise = new Promise<DecoderResult>((_, reject) => {
      setTimeout(() => reject(new Error('Decode timeout exceeded')), timeout);
    });
    
    // Create decode promise
    const decodePromise = decodeSync(encodedString, { enableDiagnostics });
    
    // Race between decode and timeout
    const result = await Promise.race([decodePromise, timeoutPromise]);
    
    return result;
    
  } catch (error) {
    const decodeTime = Date.now() - startTime;
    const decoderError = createDecodeFailedError(
      error instanceof Error ? error.message : String(error),
      encodedString,
      undefined,
      []
    );
    
    logDecoderError(decoderError, { function: 'decode', decodeTime });
    
    const result: DecoderResult = {
      success: false,
      urls: [],
      error: formatErrorMessage(decoderError),
      metadata: {
        decodeTime,
        attemptedDecoders: []
      }
    };
    
    if (enableDiagnostics) {
      logDiagnostic('Decode error', { error: result.error, encodedString });
    }
    
    return result;
  }
}

/**
 * Synchronous version of decode function
 * 
 * @param encodedString - The obfuscated string to decode
 * @param options - Optional configuration
 * @returns DecoderResult with success status, URLs, and metadata
 */
export function decodeSync(
  encodedString: string,
  options?: {
    enableDiagnostics?: boolean;
  }
): DecoderResult {
  const startTime = Date.now();
  const enableDiagnostics = options?.enableDiagnostics ?? false;
  
  try {
    // Validate input
    if (!encodedString || typeof encodedString !== 'string' || encodedString.trim().length === 0) {
      const error = createInvalidInputError(
        'Encoded string must be a non-empty string',
        encodedString
      );
      
      logDecoderError(error, { function: 'decodeSync' });
      
      const result: DecoderResult = {
        success: false,
        urls: [],
        error: formatErrorMessage(error),
        metadata: {
          decodeTime: Date.now() - startTime,
          attemptedDecoders: []
        }
      };
      
      if (enableDiagnostics) {
        logDiagnostic('Decode failed: invalid input', { encodedString });
      }
      
      return result;
    }
    
    const trimmed = encodedString.trim();
    
    // Check cache first for previously decoded results
    const cachedResult = decodeResultCache.get(trimmed);
    if (cachedResult !== undefined) {
      if (enableDiagnostics) {
        logDiagnostic('Cache hit', { encodedString: trimmed.substring(0, 50) + '...' });
      }
      // Return cached result with updated decode time
      return {
        ...cachedResult,
        metadata: {
          ...(cachedResult.metadata || {}),
          decodeTime: Date.now() - startTime,
          attemptedDecoders: cachedResult.metadata?.attemptedDecoders || []
        }
      };
    }
    
    // Step 1: Detect pattern
    const pattern = detectPattern(trimmed);
    
    if (enableDiagnostics) {
      logDiagnostic('Pattern detected', { pattern, encodedString: trimmed.substring(0, 50) + '...' });
    }
    
    // Step 2: Try primary decoder based on detected pattern
    let result: DecoderResult;
    const attemptedDecoders: string[] = [];
    
    switch (pattern) {
      case PatternType.OLD_FORMAT:
        attemptedDecoders.push('old-format-decoder');
        if (enableDiagnostics) {
          logDecodeAttempt(trimmed, pattern, 'old-format-decoder');
        }
        result = decodeOldFormat(trimmed);
        break;
        
      case PatternType.NEW_FORMAT:
        attemptedDecoders.push('new-format-decoder');
        if (enableDiagnostics) {
          logDecodeAttempt(trimmed, pattern, 'new-format-decoder');
        }
        result = decodeNewFormat(trimmed);
        break;
        
      case PatternType.UNKNOWN:
      default:
        // Unknown pattern, try all decoders
        if (enableDiagnostics) {
          logDiagnostic('Unknown pattern, trying all decoders', { encodedString: trimmed.substring(0, 50) + '...' });
        }
        result = tryAllDecoders(trimmed);
        attemptedDecoders.push(...(result.metadata?.attemptedDecoders || []));
        break;
    }
    
    // Step 3: If primary decoder failed, try fallback chain
    if (!result.success && pattern !== PatternType.UNKNOWN) {
      if (enableDiagnostics) {
        logDiagnostic('Primary decoder failed, trying fallback chain', {
          pattern,
          error: result.error
        });
      }
      
      result = tryAllDecoders(trimmed);
      if (result.metadata?.attemptedDecoders) {
        attemptedDecoders.push(...result.metadata.attemptedDecoders);
      }
    }
    
    // Step 4: URLs are already validated by individual decoders
    // No additional validation needed here to maintain consistency
    
    // Step 5: Add performance tracking
    const decodeTime = Date.now() - startTime;
    result = {
      ...result,
      metadata: {
        decodeTime,
        attemptedDecoders: Array.from(new Set(attemptedDecoders)) // Remove duplicates
      }
    };
    
    // Step 6: Cache successful results
    if (result.success) {
      decodeResultCache.set(trimmed, result);
    }
    
    // Step 7: Record performance metrics
    recordDecodeMetrics(
      result.pattern || pattern,
      result.decoderUsed || 'unknown',
      decodeTime,
      result.success,
      result.urls.length,
      trimmed.length,
      result.metadata?.attemptedDecoders || []
    );
    
    // Step 8: Save failed decode attempts for analysis
    if (!result.success) {
      const error = createDecodeFailedError(
        result.error || 'Decode failed',
        trimmed,
        pattern,
        result.metadata?.attemptedDecoders
      );
      saveFailedDecode(trimmed, pattern, result.metadata?.attemptedDecoders || [], error);
    }
    
    if (enableDiagnostics) {
      logDiagnostic('Decode complete', {
        success: result.success,
        urlCount: result.urls.length,
        decodeTime,
        attemptedDecoders: result.metadata?.attemptedDecoders || []
      });
    }
    
    return result;
    
  } catch (error) {
    const decodeTime = Date.now() - startTime;
    const decoderError = createDecodeFailedError(
      error instanceof Error ? error.message : String(error),
      encodedString,
      undefined,
      []
    );
    
    logDecoderError(decoderError, { function: 'decodeSync', decodeTime });
    
    const result: DecoderResult = {
      success: false,
      urls: [],
      error: formatErrorMessage(decoderError),
      metadata: {
        decodeTime,
        attemptedDecoders: []
      }
    };
    
    if (enableDiagnostics) {
      logDiagnostic('Decode error', { error: result.error, encodedString });
    }
    
    return result;
  }
}

// Re-export types and utilities for convenience
export * from './types';
export { detectPattern } from './pattern-detector';
export { decodeOldFormat } from './old-format-decoder';
export { decodeNewFormat } from './new-format-decoder';
export { isValidM3u8Url, extractUrls } from './utils';
export { PatternRegistry, patternRegistry, initializePatternRegistry, initializePatternRegistrySync } from './pattern-registry';
export { OLD_FORMAT_PATTERN, NEW_FORMAT_PATTERN, ALL_PATTERNS } from './pattern-definitions';
export {
  createInvalidInputError,
  createDecodeFailedError,
  createNoUrlsFoundError,
  createInvalidPatternError,
  createValidationFailedError,
  createDecoderError,
  logDecoderError,
  logDecodeSuccess,
  logDecodeAttempt,
  formatErrorMessage,
  isDecoderError,
  withErrorHandling
} from './error-handler';
export {
  patternStorage,
  saveFailedDecode,
  getUnknownPatterns,
  getStorageStatistics,
  exportFailedAttempts
} from './pattern-storage';
export type { FailedDecodeAttempt } from './pattern-storage';
export {
  patternDetectionCache,
  xorKeyCache,
  decodeResultCache,
  getAllCacheStats,
  clearAllCaches
} from './cache';
export {
  performanceMonitor,
  recordDecodeMetrics,
  getPerformanceStats,
  checkPerformanceRequirements,
  exportPerformanceMetrics
} from './performance';
