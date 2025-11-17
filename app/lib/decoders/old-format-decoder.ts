/**
 * OLD Format Decoder
 * 
 * Decodes obfuscated strings using the reverse-hex-shift algorithm.
 * This format is identified by the presence of colons and characters beyond hex range (g-z).
 * 
 * Algorithm:
 * 1. Reverse the entire string
 * 2. Subtract 1 from each character's ASCII code
 * 3. Convert hex pairs to ASCII characters
 * 4. Extract URLs from the decoded content
 * 
 * Success Rate: 100% on known OLD format samples
 */

import { DecoderResult, PatternType } from './types';

/**
 * Decodes an OLD format encoded string
 * 
 * @param encoded - The encoded string to decode
 * @returns DecoderResult with success status, extracted URLs, and any errors
 */
export function decodeOldFormat(encoded: string): DecoderResult {
  const startTime = Date.now();
  
  try {
    // Validate input
    if (!encoded || typeof encoded !== 'string') {
      return {
        success: false,
        urls: [],
        pattern: PatternType.OLD_FORMAT,
        decoderUsed: 'old-format-decoder',
        error: 'Invalid input: encoded string must be a non-empty string',
        metadata: {
          decodeTime: Date.now() - startTime,
          attemptedDecoders: ['old-format-decoder']
        }
      };
    }

    // Step 1: Reverse the string
    const reversed = encoded.split('').reverse().join('');
    
    // Step 2: Subtract 1 from each character's ASCII code
    let adjusted = '';
    for (let i = 0; i < reversed.length; i++) {
      adjusted += String.fromCharCode(reversed.charCodeAt(i) - 1);
    }
    
    // Step 3: Convert hex pairs to ASCII characters
    let decoded = '';
    for (let i = 0; i < adjusted.length; i += 2) {
      const hexPair = adjusted.substring(i, i + 2);
      const charCode = parseInt(hexPair, 16);
      
      if (!isNaN(charCode) && charCode > 0) {
        decoded += String.fromCharCode(charCode);
      }
    }
    
    // Step 4: Extract URLs from decoded content
    const urls = extractUrls(decoded);
    
    const decodeTime = Date.now() - startTime;
    
    if (urls.length === 0) {
      return {
        success: false,
        urls: [],
        pattern: PatternType.OLD_FORMAT,
        decoderUsed: 'old-format-decoder',
        error: 'No URLs found in decoded content',
        metadata: {
          decodeTime,
          attemptedDecoders: ['old-format-decoder']
        }
      };
    }
    
    return {
      success: true,
      urls,
      pattern: PatternType.OLD_FORMAT,
      decoderUsed: 'old-format-decoder',
      metadata: {
        decodeTime,
        attemptedDecoders: ['old-format-decoder']
      }
    };
    
  } catch (error) {
    const decodeTime = Date.now() - startTime;
    return {
      success: false,
      urls: [],
      pattern: PatternType.OLD_FORMAT,
      decoderUsed: 'old-format-decoder',
      error: `Decoding failed: ${error instanceof Error ? error.message : String(error)}`,
      metadata: {
        decodeTime,
        attemptedDecoders: ['old-format-decoder']
      }
    };
  }
}

/**
 * Checks if a string can be decoded using the OLD format decoder
 * 
 * @param encoded - The encoded string to check
 * @returns true if the string matches OLD format characteristics
 */
export function canDecodeOldFormat(encoded: string): boolean {
  if (!encoded || typeof encoded !== 'string') {
    return false;
  }
  
  // OLD format characteristics:
  // - Contains colons (:)
  // - Contains characters beyond hex range (g-z)
  return encoded.includes(':') && /[g-z]/i.test(encoded);
}

/**
 * Extracts URLs from decoded content
 * Optimized for performance with better regex and Set-based deduplication
 * 
 * @param decoded - The decoded string content
 * @returns Array of extracted URLs
 */
function extractUrls(decoded: string): string[] {
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
 * Validates if a decoded URL is a valid m3u8 URL
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
    
    // Should contain m3u8 in the path or be a valid streaming URL
    return url.includes('.m3u8') || url.includes('/playlist') || url.includes('/stream');
  } catch {
    return false;
  }
}
