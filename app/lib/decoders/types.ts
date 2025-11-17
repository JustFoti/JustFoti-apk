/**
 * Type definitions for the prorcp obfuscation decoder system
 */

/**
 * Enum representing the different obfuscation pattern types
 */
export enum PatternType {
  OLD_FORMAT = 'old_format',
  NEW_FORMAT = 'new_format',
  UNKNOWN = 'unknown'
}

/**
 * Result returned by decoder functions
 */
export interface DecoderResult {
  /** Whether the decoding was successful */
  success: boolean;
  /** Array of extracted m3u8 URLs */
  urls: string[];
  /** The pattern type that was used for decoding */
  pattern?: PatternType;
  /** Name of the decoder that successfully decoded the string */
  decoderUsed?: string;
  /** Error message if decoding failed */
  error?: string;
  /** Additional metadata about the decoding process */
  metadata?: {
    /** Time taken to decode in milliseconds */
    decodeTime: number;
    /** List of decoders that were attempted */
    attemptedDecoders: string[];
  };
}

/**
 * Represents encoded data with metadata
 */
export interface EncodedData {
  /** The raw encoded string */
  raw: string;
  /** Detected pattern type */
  pattern: PatternType;
  /** Confidence score for pattern detection (0-1) */
  confidence: number;
  /** Source identifier (e.g., div ID or source page) */
  source: string;
}

/**
 * Definition of an obfuscation pattern with its decoder and detector
 */
export interface PatternDefinition {
  /** Pattern type identifier */
  type: PatternType;
  /** Human-readable name */
  name: string;
  /** Description of the pattern */
  description: string;
  /** List of characteristics that identify this pattern */
  characteristics: string[];
  /** Function to decode strings matching this pattern */
  decoder: (encoded: string) => DecoderResult;
  /** Function to detect if a string matches this pattern */
  detector: (encoded: string) => boolean;
  /** Example encoded strings for this pattern */
  examples: string[];
}

/**
 * Error types that can occur during decoding
 */
export enum DecoderErrorType {
  INVALID_INPUT = 'invalid_input',
  DECODE_FAILED = 'decode_failed',
  NO_URLS_FOUND = 'no_urls_found',
  INVALID_PATTERN = 'invalid_pattern',
  VALIDATION_FAILED = 'validation_failed'
}

/**
 * Structured error information for decoder failures
 */
export interface DecoderError {
  /** Type of error that occurred */
  type: DecoderErrorType;
  /** Human-readable error message */
  message: string;
  /** Additional context about the error */
  context: {
    /** The encoded string that failed to decode */
    encodedString?: string;
    /** The pattern that was detected or attempted */
    pattern?: PatternType;
    /** List of decoders that were attempted */
    attemptedDecoders?: string[];
  };
}
