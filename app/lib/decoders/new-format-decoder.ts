/**
 * NEW Format Decoder
 * 
 * Decodes obfuscated strings using XOR decryption with various key strategies.
 * This format is identified by pure base64 or hex characters without colons.
 * 
 * Algorithm:
 * 1. Detect encoding type (base64 or hex)
 * 2. Decode from base64 or hex to bytes
 * 3. Try XOR decryption with multiple key strategies
 * 4. Extract URLs from the decoded content
 * 
 * Performance optimizations:
 * - XOR key caching for successful keys
 * - Early exit on successful decode
 * - Optimized regex patterns
 * 
 * Success Rate Target: 95%+ on known NEW format samples
 */

import { DecoderResult, PatternType } from './types';
import { xorKeyCache } from './cache';

/**
 * Known XOR keys extracted from PlayerJS decoder analysis
 * These keys are derived from static analysis of obfuscated decoder functions
 */
const KNOWN_XOR_KEYS = [
  // Keys extracted from PlayerJS analysis
  'Point',
  'Range',
  // Common keys found in similar obfuscation schemes
  'prorcp',
  'cloudnestra',
  'player',
  'video',
  'stream',
  // Empty key (no XOR)
  '',
];

/**
 * Decodes a NEW format encoded string
 * 
 * @param encoded - The encoded string to decode
 * @returns DecoderResult with success status, extracted URLs, and any errors
 */
export function decodeNewFormat(encoded: string): DecoderResult {
  const startTime = Date.now();
  
  try {
    // Validate input
    if (!encoded || typeof encoded !== 'string') {
      return {
        success: false,
        urls: [],
        pattern: PatternType.NEW_FORMAT,
        decoderUsed: 'new-format-decoder',
        error: 'Invalid input: encoded string must be a non-empty string',
        metadata: {
          decodeTime: Date.now() - startTime,
          attemptedDecoders: ['new-format-decoder']
        }
      };
    }

    // Step 1: Detect encoding type and decode to bytes
    let bytes: Uint8Array;
    try {
      if (isHexEncoded(encoded)) {
        bytes = hexDecode(encoded);
      } else if (isBase64Encoded(encoded)) {
        bytes = base64Decode(encoded);
      } else {
        return {
          success: false,
          urls: [],
          pattern: PatternType.NEW_FORMAT,
          decoderUsed: 'new-format-decoder',
          error: 'Unable to detect encoding type (expected base64 or hex)',
          metadata: {
            decodeTime: Date.now() - startTime,
            attemptedDecoders: ['new-format-decoder']
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        urls: [],
        pattern: PatternType.NEW_FORMAT,
        decoderUsed: 'new-format-decoder',
        error: `Decoding failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          decodeTime: Date.now() - startTime,
          attemptedDecoders: ['new-format-decoder']
        }
      };
    }

    // Step 2: Try XOR decryption with multiple key strategies
    // Check cache first for previously successful key
    const cachedKey = xorKeyCache.get(encoded);
    if (cachedKey !== undefined) {
      try {
        const decrypted = xorDecrypt(bytes, cachedKey);
        const urls = extractUrls(decrypted);
        
        if (urls.length > 0) {
          const decodeTime = Date.now() - startTime;
          return {
            success: true,
            urls,
            pattern: PatternType.NEW_FORMAT,
            decoderUsed: 'new-format-decoder',
            metadata: {
              decodeTime,
              attemptedDecoders: ['new-format-decoder']
            }
          };
        }
      } catch {
        // Cached key failed, continue with full key search
      }
    }
    
    // Try all keys if cached key didn't work
    const allKeys = [
      ...KNOWN_XOR_KEYS,
      ...generateDerivedKeys(encoded),
    ];

    for (const key of allKeys) {
      try {
        const decrypted = xorDecrypt(bytes, key);
        const urls = extractUrls(decrypted);
        
        if (urls.length > 0) {
          // Cache successful key for future use
          xorKeyCache.set(encoded, key);
          
          const decodeTime = Date.now() - startTime;
          return {
            success: true,
            urls,
            pattern: PatternType.NEW_FORMAT,
            decoderUsed: 'new-format-decoder',
            metadata: {
              decodeTime,
              attemptedDecoders: ['new-format-decoder']
            }
          };
        }
      } catch {
        // Continue to next key
        continue;
      }
    }

    // If no key worked, return failure
    const decodeTime = Date.now() - startTime;
    return {
      success: false,
      urls: [],
      pattern: PatternType.NEW_FORMAT,
      decoderUsed: 'new-format-decoder',
      error: `No valid URLs found after trying ${allKeys.length} XOR keys`,
      metadata: {
        decodeTime,
        attemptedDecoders: ['new-format-decoder']
      }
    };
    
  } catch (error) {
    const decodeTime = Date.now() - startTime;
    return {
      success: false,
      urls: [],
      pattern: PatternType.NEW_FORMAT,
      decoderUsed: 'new-format-decoder',
      error: `Decoding failed: ${error instanceof Error ? error.message : String(error)}`,
      metadata: {
        decodeTime,
        attemptedDecoders: ['new-format-decoder']
      }
    };
  }
}

/**
 * Checks if a string can be decoded using the NEW format decoder
 * 
 * @param encoded - The encoded string to check
 * @returns true if the string matches NEW format characteristics
 */
export function canDecodeNewFormat(encoded: string): boolean {
  if (!encoded || typeof encoded !== 'string') {
    return false;
  }
  
  // NEW format characteristics:
  // - Pure base64 characters OR pure hex characters
  // - No colons
  // - For hex: no extended characters (g-z in lowercase only, since hex is case-insensitive)
  
  // Check if it's base64 or hex
  const isBase64 = isBase64Encoded(encoded);
  const isHex = isHexEncoded(encoded);
  
  if (!isBase64 && !isHex) {
    return false;
  }
  
  // Must not have colons (OLD format indicator)
  if (encoded.includes(':')) {
    return false;
  }
  
  // If it's hex, check for extended characters (g-z in lowercase)
  // Base64 can have any letters, so we don't check for g-z
  if (isHex && /[g-z]/.test(encoded.toLowerCase())) {
    return false;
  }
  
  return true;
}

/**
 * Checks if a string is base64 encoded
 */
function isBase64Encoded(str: string): boolean {
  // Base64 uses A-Z, a-z, 0-9, +, /, and = for padding
  // Must have length divisible by 4 and contain at least one non-hex character
  // or have base64 padding (=)
  if (!/^[A-Za-z0-9+/]+=*$/.test(str)) {
    return false;
  }
  
  // Check for base64 padding
  if (str.includes('=')) {
    return str.length % 4 === 0;
  }
  
  // If no padding, check if it contains characters beyond hex (g-z, G-Z, +, /)
  // or if length is divisible by 4 (base64 requirement)
  const hasNonHexChars = /[g-zG-Z+/]/.test(str);
  const validLength = str.length % 4 === 0;
  
  return hasNonHexChars && validLength;
}

/**
 * Checks if a string is hex encoded
 */
function isHexEncoded(str: string): boolean {
  // Hex uses only 0-9 and a-f (case insensitive)
  return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0;
}

/**
 * Decodes a base64 string to bytes
 */
function base64Decode(encoded: string): Uint8Array {
  // Use browser's atob for base64 decoding (edge-compatible)
  const binaryString = atob(encoded);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * Decodes a hex string to bytes
 */
function hexDecode(encoded: string): Uint8Array {
  const bytes = new Uint8Array(encoded.length / 2);
  
  for (let i = 0; i < encoded.length; i += 2) {
    const hexPair = encoded.substring(i, i + 2);
    bytes[i / 2] = parseInt(hexPair, 16);
  }
  
  return bytes;
}

/**
 * Performs XOR decryption on bytes using a key
 */
function xorDecrypt(bytes: Uint8Array, key: string): string {
  if (!key || key.length === 0) {
    // No key means no XOR, just convert bytes to string
    return bytesToString(bytes);
  }
  
  const decrypted = new Uint8Array(bytes.length);
  
  for (let i = 0; i < bytes.length; i++) {
    const keyChar = key.charCodeAt(i % key.length);
    decrypted[i] = bytes[i] ^ keyChar;
  }
  
  return bytesToString(decrypted);
}

/**
 * Converts bytes to string
 */
function bytesToString(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

/**
 * Generates derived keys from the encoded string
 * These keys are based on common patterns found in obfuscated code
 */
function generateDerivedKeys(encoded: string): string[] {
  const keys: string[] = [];
  
  // Try substrings of various lengths
  if (encoded.length >= 8) {
    keys.push(encoded.substring(0, 8));
    keys.push(encoded.substring(0, 16));
  }
  
  // Try reversed substrings
  if (encoded.length >= 8) {
    keys.push(encoded.substring(0, 8).split('').reverse().join(''));
  }
  
  // Try hash-based keys (simple hash)
  keys.push(simpleHash(encoded));
  
  return keys;
}

/**
 * Simple hash function for key generation
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString();
}

/**
 * Extracts URLs from decoded content
 * Optimized regex pattern for better performance
 */
function extractUrls(decoded: string): string[] {
  if (!decoded) {
    return [];
  }
  
  // Optimized URL pattern - more specific to reduce backtracking
  // Matches http:// or https:// followed by valid URL characters
  const urlPattern = /https?:\/\/[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+/g;
  const matches = decoded.match(urlPattern);
  
  if (!matches) {
    return [];
  }
  
  // Use Set for faster duplicate removal
  const uniqueUrls = new Set<string>();
  
  for (const url of matches) {
    const trimmed = url.trim();
    if (trimmed.length > 0 && isValidStreamUrl(trimmed)) {
      uniqueUrls.add(trimmed);
    }
  }
  
  return Array.from(uniqueUrls);
}

/**
 * Validates if a decoded URL is a valid streaming URL
 */
function isValidStreamUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Must be HTTP or HTTPS
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Should contain m3u8, playlist, or stream in the path
    return url.includes('.m3u8') || 
           url.includes('/playlist') || 
           url.includes('/stream') ||
           url.includes('.mp4') ||
           url.includes('.ts');
  } catch {
    return false;
  }
}
