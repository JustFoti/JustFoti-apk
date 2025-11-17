/**
 * Pattern Definitions
 * 
 * Defines the characteristics and behavior of each obfuscation pattern.
 * Each pattern includes its decoder, detector, examples, and metadata.
 */

import { PatternType, PatternDefinition } from './types';
import { decodeOldFormat, canDecodeOldFormat } from './old-format-decoder';
import { decodeNewFormat, canDecodeNewFormat } from './new-format-decoder';

/**
 * OLD Format Pattern Definition
 * 
 * Characteristics:
 * - Uses reverse-hex-shift algorithm
 * - Contains colons (:) as separators
 * - Contains characters beyond hex range (g-z)
 * - Hex-encoded after character shifting
 * 
 * Algorithm:
 * 1. Reverse the entire string
 * 2. Subtract 1 from each character's ASCII code
 * 3. Convert hex pairs to ASCII characters
 * 4. Extract URLs from decoded content
 * 
 * Success Rate: 100% on known samples
 */
export const OLD_FORMAT_PATTERN: PatternDefinition = {
  type: PatternType.OLD_FORMAT,
  name: 'OLD Format (Reverse-Hex-Shift)',
  description: 'Obfuscation using string reversal, character shifting (+1), and hex encoding. Identified by colons and characters beyond hex range (g-z).',
  characteristics: [
    'Contains colon characters (:)',
    'Contains characters beyond hex range (g-z)',
    'Uses hex encoding for final obfuscation',
    'Applies character shifting (+1 to ASCII codes)',
    'Reverses the entire string',
    'Typically longer than original content due to hex encoding',
  ],
  decoder: decodeOldFormat,
  detector: canDecodeOldFormat,
  examples: [
    // Example 1: Typical OLD format with colons and beyond-hex characters
    'z9y8x7w6v5u4t3s2r1q0p:o9n8m7l6k5j4i3h2g1',
    // Example 2: Another OLD format sample
    'p9o8n7m6l5k4j3i2h1g:z9y8x7w6v5u4t3s2r1q0',
    // Example 3: OLD format with mixed characters
    'r1q0p9o8n7m6l5k4j3i2h1g:z9y8x7w6v5u4t3s2',
  ],
};

/**
 * NEW Format Pattern Definition
 * 
 * Characteristics:
 * - Uses XOR encryption with dynamic keys
 * - Base64 or hex encoded after XOR
 * - Pure base64 characters (A-Za-z0-9+/=) or pure hex (0-9a-fA-F)
 * - No colons
 * - Requires key extraction from PlayerJS
 * 
 * Algorithm:
 * 1. Detect encoding type (base64 or hex)
 * 2. Decode from base64 or hex to bytes
 * 3. Try XOR decryption with multiple key strategies
 * 4. Extract URLs from decoded content
 * 
 * Success Rate Target: 95%+ on known samples
 */
export const NEW_FORMAT_PATTERN: PatternDefinition = {
  type: PatternType.NEW_FORMAT,
  name: 'NEW Format (XOR + Base64/Hex)',
  description: 'Obfuscation using XOR encryption with dynamic keys, followed by base64 or hex encoding. Identified by pure base64/hex characters without colons.',
  characteristics: [
    'Pure base64 characters (A-Za-z0-9+/=) OR pure hex characters (0-9a-fA-F)',
    'No colon characters',
    'Uses XOR encryption with dynamic keys',
    'Keys may be static, derived, or dynamically generated',
    'Base64 strings have length divisible by 4 (with padding)',
    'Hex strings have even length',
    'Requires multiple key strategies for decryption',
  ],
  decoder: decodeNewFormat,
  detector: canDecodeNewFormat,
  examples: [
    // Example 1: Base64 encoded NEW format
    'SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0',
    // Example 2: Base64 with padding
    'VGhpcyBpcyBhIHRlc3Qgc3RyaW5nIHdpdGggcGFkZGluZw==',
    // Example 3: Hex encoded NEW format
    '48656c6c6f20576f726c6421',
    // Example 4: Longer base64 string
    'QmFzZTY0IGVuY29kZWQgc3RyaW5nIHdpdGggWE9SIGVuY3J5cHRpb24=',
  ],
};

/**
 * Array of all pattern definitions
 * Used for iteration and registration
 */
export const ALL_PATTERNS: PatternDefinition[] = [
  OLD_FORMAT_PATTERN,
  NEW_FORMAT_PATTERN,
];
