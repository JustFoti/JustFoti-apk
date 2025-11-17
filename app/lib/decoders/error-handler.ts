/**
 * Error handling utilities for the decoder system
 * Provides factory functions for creating structured errors and logging with context preservation
 */

import { DecoderError, DecoderErrorType, PatternType } from './types';

/**
 * Factory function to create a DecoderError for invalid input
 */
export function createInvalidInputError(
  message: string,
  encodedString?: string
): DecoderError {
  return {
    type: DecoderErrorType.INVALID_INPUT,
    message,
    context: {
      encodedString: encodedString ? truncateString(encodedString, 100) : undefined,
    },
  };
}

/**
 * Factory function to create a DecoderError for decode failures
 */
export function createDecodeFailedError(
  message: string,
  encodedString?: string,
  pattern?: PatternType,
  attemptedDecoders?: string[]
): DecoderError {
  return {
    type: DecoderErrorType.DECODE_FAILED,
    message,
    context: {
      encodedString: encodedString ? truncateString(encodedString, 100) : undefined,
      pattern,
      attemptedDecoders,
    },
  };
}

/**
 * Factory function to create a DecoderError when no URLs are found
 */
export function createNoUrlsFoundError(
  message: string,
  encodedString?: string,
  pattern?: PatternType
): DecoderError {
  return {
    type: DecoderErrorType.NO_URLS_FOUND,
    message,
    context: {
      encodedString: encodedString ? truncateString(encodedString, 100) : undefined,
      pattern,
    },
  };
}

/**
 * Factory function to create a DecoderError for invalid patterns
 */
export function createInvalidPatternError(
  message: string,
  encodedString?: string,
  pattern?: PatternType
): DecoderError {
  return {
    type: DecoderErrorType.INVALID_PATTERN,
    message,
    context: {
      encodedString: encodedString ? truncateString(encodedString, 100) : undefined,
      pattern,
    },
  };
}

/**
 * Factory function to create a DecoderError for validation failures
 */
export function createValidationFailedError(
  message: string,
  encodedString?: string,
  attemptedDecoders?: string[]
): DecoderError {
  return {
    type: DecoderErrorType.VALIDATION_FAILED,
    message,
    context: {
      encodedString: encodedString ? truncateString(encodedString, 100) : undefined,
      attemptedDecoders,
    },
  };
}

/**
 * Generic factory function to create any DecoderError
 */
export function createDecoderError(
  type: DecoderErrorType,
  message: string,
  context?: {
    encodedString?: string;
    pattern?: PatternType;
    attemptedDecoders?: string[];
  }
): DecoderError {
  return {
    type,
    message,
    context: {
      encodedString: context?.encodedString ? truncateString(context.encodedString, 100) : undefined,
      pattern: context?.pattern,
      attemptedDecoders: context?.attemptedDecoders,
    },
  };
}

/**
 * Truncate a string to a maximum length for logging
 */
function truncateString(str: string, maxLength: number): string {
  // Handle non-string inputs
  if (typeof str !== 'string') {
    str = String(str);
  }
  
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...';
}

/**
 * Log a decoder error with full context preservation
 */
export function logDecoderError(error: DecoderError, additionalContext?: Record<string, any>): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    errorType: error.type,
    message: error.message,
    context: error.context,
    ...additionalContext,
  };

  // In production, this would integrate with a logging service
  // For now, we use console.error with structured data
  console.error('[DecoderError]', JSON.stringify(logEntry, null, 2));
}

/**
 * Log a successful decode operation with context
 */
export function logDecodeSuccess(
  encodedString: string,
  pattern: PatternType,
  decoderUsed: string,
  urlCount: number,
  decodeTime: number
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    status: 'success',
    pattern,
    decoderUsed,
    urlCount,
    decodeTime,
    encodedStringLength: encodedString.length,
  };

  console.log('[DecoderSuccess]', JSON.stringify(logEntry, null, 2));
}

/**
 * Log a decode attempt with context
 */
export function logDecodeAttempt(
  encodedString: string,
  pattern: PatternType,
  decoderName: string
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    status: 'attempting',
    pattern,
    decoderName,
    encodedStringLength: encodedString.length,
    encodedStringPreview: truncateString(encodedString, 50),
  };

  console.log('[DecoderAttempt]', JSON.stringify(logEntry, null, 2));
}

/**
 * Convert a DecoderError to a user-friendly error message
 */
export function formatErrorMessage(error: DecoderError): string {
  let message = `[${error.type}] ${error.message}`;

  if (error.context.pattern) {
    message += ` (Pattern: ${error.context.pattern})`;
  }

  if (error.context.attemptedDecoders && error.context.attemptedDecoders.length > 0) {
    message += ` (Attempted: ${error.context.attemptedDecoders.join(', ')})`;
  }

  return message;
}

/**
 * Check if an error is a DecoderError
 */
export function isDecoderError(error: any): error is DecoderError {
  return (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'message' in error &&
    'context' in error &&
    Object.values(DecoderErrorType).includes(error.type)
  );
}

/**
 * Wrap a decoder function with error handling and logging
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  decoderName: string,
  decoderFn: T
): T {
  return ((...args: Parameters<T>): any => {
    try {
      const result = decoderFn(...args);
      
      // Log success if result indicates success
      if (result && typeof result === 'object' && result.success) {
        logDecodeSuccess(
          args[0] || '',
          result.pattern || PatternType.UNKNOWN,
          decoderName,
          result.urls?.length || 0,
          result.metadata?.decodeTime || 0
        );
      }
      
      return result;
    } catch (error) {
      // Convert any thrown error to a DecoderError
      const decoderError = isDecoderError(error)
        ? error
        : createDecodeFailedError(
            error instanceof Error ? error.message : String(error),
            args[0],
            undefined,
            [decoderName]
          );
      
      logDecoderError(decoderError, { decoderName });
      
      // Return a failed result instead of throwing
      return {
        success: false,
        urls: [],
        error: formatErrorMessage(decoderError),
        decoderUsed: decoderName,
      };
    }
  }) as T;
}
