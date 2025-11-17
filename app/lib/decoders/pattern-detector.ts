/**
 * Pattern detection engine for identifying obfuscation patterns in encoded strings
 */

import { PatternType } from './types';
import { patternDetectionCache } from './cache';

/**
 * Detects the obfuscation pattern used in an encoded string
 * 
 * Detection logic:
 * - OLD_FORMAT: Contains colons (:) AND characters beyond hex range (g-z)
 * - NEW_FORMAT: Pure base64 characters (A-Za-z0-9+/=) AND no colons
 * - UNKNOWN: Doesn't match known patterns
 * 
 * Uses caching to avoid redundant pattern detection.
 * 
 * @param encodedString - The encoded string to analyze
 * @returns The detected pattern type
 */
export function detectPattern(encodedString: string): PatternType {
  // Validate input
  if (!encodedString || typeof encodedString !== 'string' || encodedString.trim().length === 0) {
    return PatternType.UNKNOWN;
  }

  const trimmed = encodedString.trim();
  
  // Check cache first
  const cached = patternDetectionCache.get(trimmed);
  if (cached !== undefined) {
    return cached;
  }

  // OLD format detection: contains colons AND characters beyond hex range (g-z)
  const hasColons = trimmed.includes(':');
  const hasBeyondHexChars = /[g-z]/i.test(trimmed);
  
  if (hasColons && hasBeyondHexChars) {
    const pattern = PatternType.OLD_FORMAT;
    patternDetectionCache.set(trimmed, pattern);
    return pattern;
  }

  // NEW format detection: pure base64 characters AND no colons
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed);
  const noColons = !trimmed.includes(':');
  
  if (isBase64 && noColons) {
    const pattern = PatternType.NEW_FORMAT;
    patternDetectionCache.set(trimmed, pattern);
    return pattern;
  }

  // Unknown pattern
  const pattern = PatternType.UNKNOWN;
  patternDetectionCache.set(trimmed, pattern);
  return pattern;
}

/**
 * Calculates a confidence score for a detected pattern
 * 
 * Confidence scoring:
 * - OLD_FORMAT: Higher confidence with more colons and beyond-hex characters
 * - NEW_FORMAT: Higher confidence with valid base64 length and padding
 * - UNKNOWN: Always returns 0
 * 
 * @param encodedString - The encoded string to analyze
 * @param pattern - The pattern type to score confidence for
 * @returns Confidence score between 0 and 1
 */
export function getConfidence(encodedString: string, pattern: PatternType): number {
  // Validate input
  if (!encodedString || typeof encodedString !== 'string' || encodedString.trim().length === 0) {
    return 0;
  }

  const trimmed = encodedString.trim();

  switch (pattern) {
    case PatternType.OLD_FORMAT:
      return calculateOldFormatConfidence(trimmed);
    
    case PatternType.NEW_FORMAT:
      return calculateNewFormatConfidence(trimmed);
    
    case PatternType.UNKNOWN:
    default:
      return 0;
  }
}

/**
 * Calculates confidence score for OLD format pattern
 * 
 * Scoring factors:
 * - Presence of colons (required)
 * - Presence of beyond-hex characters (required)
 * - Ratio of beyond-hex characters to total length
 * - Presence of hex-like pairs
 * 
 * @param encodedString - The encoded string to analyze
 * @returns Confidence score between 0 and 1
 */
function calculateOldFormatConfidence(encodedString: string): number {
  let score = 0;
  
  // Check for colons (required - 30% weight)
  const hasColons = encodedString.includes(':');
  if (!hasColons) {
    return 0; // Must have colons for OLD format
  }
  score += 0.3;
  
  // Check for beyond-hex characters (required - 30% weight)
  const beyondHexMatches = encodedString.match(/[g-z]/gi);
  if (!beyondHexMatches || beyondHexMatches.length === 0) {
    return 0; // Must have beyond-hex chars for OLD format
  }
  score += 0.3;
  
  // Calculate ratio of beyond-hex characters (20% weight)
  const beyondHexRatio = beyondHexMatches.length / encodedString.length;
  score += Math.min(beyondHexRatio * 2, 0.2); // Cap at 0.2
  
  // Check for hex-like structure (pairs of characters) (20% weight)
  const hexPairPattern = /[0-9a-f]{2}/gi;
  const hexPairs = encodedString.match(hexPairPattern);
  if (hexPairs && hexPairs.length > 0) {
    const hexRatio = (hexPairs.length * 2) / encodedString.length;
    score += Math.min(hexRatio * 0.4, 0.2); // Cap at 0.2
  }
  
  return Math.min(score, 1); // Cap at 1.0
}

/**
 * Calculates confidence score for NEW format pattern
 * 
 * Scoring factors:
 * - Valid base64 character set (required)
 * - No colons (required)
 * - Valid base64 length (multiple of 4 or with proper padding)
 * - Presence of padding characters
 * 
 * @param encodedString - The encoded string to analyze
 * @returns Confidence score between 0 and 1
 */
function calculateNewFormatConfidence(encodedString: string): number {
  let score = 0;
  
  // Check for valid base64 characters (required - 40% weight)
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(encodedString);
  if (!isBase64) {
    return 0; // Must be valid base64 for NEW format
  }
  score += 0.4;
  
  // Check for no colons (required - 20% weight)
  const hasColons = encodedString.includes(':');
  if (hasColons) {
    return 0; // Must not have colons for NEW format
  }
  score += 0.2;
  
  // Check for valid base64 length (20% weight)
  // Base64 strings should be multiples of 4 in length
  const lengthValid = encodedString.length % 4 === 0;
  if (lengthValid) {
    score += 0.2;
  } else {
    // Partial credit if close to valid length
    const remainder = encodedString.length % 4;
    score += (4 - remainder) * 0.05; // 0.05, 0.10, or 0.15
  }
  
  // Check for proper padding (20% weight)
  const paddingMatch = encodedString.match(/=+$/);
  if (paddingMatch) {
    const paddingLength = paddingMatch[0].length;
    // Valid padding is 1 or 2 equals signs at the end
    if (paddingLength <= 2) {
      score += 0.2;
    } else {
      score += 0.1; // Partial credit for having padding
    }
  } else if (encodedString.length % 4 === 0) {
    // No padding but length is valid (some base64 implementations omit padding)
    score += 0.15;
  }
  
  return Math.min(score, 1); // Cap at 1.0
}
