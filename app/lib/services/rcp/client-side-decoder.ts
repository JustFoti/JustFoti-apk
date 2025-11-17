/**
 * CLIENT-SIDE DECODER FOR VERCEL EDGE
 * 
 * This decoder runs entirely in the browser/edge runtime without:
 * - Puppeteer
 * - JSDOM
 * - File system access
 * - Node.js-specific APIs
 * 
 * It uses pattern detection to determine the encoding method and decode accordingly.
 */

interface EncodingPatterns {
  hasColons: boolean;
  hasEquals: boolean;
  hasDashes: boolean;
  hasUnderscores: boolean;
  hasSlashes: boolean;
  hasPlus: boolean;
  onlyHex: boolean;
  onlyBase64: boolean;
  onlyUrlSafeBase64: boolean;
  onlyAlphanumeric: boolean;
  startsWithNumber: boolean;
  startsWithLetter: boolean;
  hasSpecialChars: boolean;
}

type DecoderMethod = 
  | 'hex-colon'
  | 'hex'
  | 'base64'
  | 'base64-urlsafe'
  | 'base64-urlsafe-padded'
  | 'caesar';

/**
 * Detect encoding pattern from encoded string
 */
function detectEncodingPattern(encoded: string): EncodingPatterns {
  return {
    hasColons: encoded.includes(':'),
    hasEquals: encoded.includes('='),
    hasDashes: encoded.includes('-'),
    hasUnderscores: encoded.includes('_'),
    hasSlashes: encoded.includes('/'),
    hasPlus: encoded.includes('+'),
    onlyHex: /^[0-9a-fA-F:]+$/.test(encoded),
    onlyBase64: /^[A-Za-z0-9+/=]+$/.test(encoded),
    onlyUrlSafeBase64: /^[A-Za-z0-9_-]+$/.test(encoded),
    onlyAlphanumeric: /^[a-zA-Z0-9]+$/.test(encoded),
    startsWithNumber: /^[0-9]/.test(encoded),
    startsWithLetter: /^[a-zA-Z]/.test(encoded),
    hasSpecialChars: /[^a-zA-Z0-9+/=_-]/.test(encoded)
  };
}

/**
 * Determine decoder method based on patterns
 */
function determineDecoderMethod(patterns: EncodingPatterns): DecoderMethod {
  // Pattern 1: Hex with colons (e.g., "48:65:6c:6c:6f")
  if (patterns.hasColons && patterns.onlyHex) {
    return 'hex-colon';
  }
  
  // Pattern 2: Pure hex (no colons)
  if (patterns.onlyHex && patterns.onlyAlphanumeric && !patterns.hasColons) {
    return 'hex';
  }
  
  // Pattern 3: Standard Base64 (has + or / or =)
  if (patterns.onlyBase64 && (patterns.hasPlus || patterns.hasSlashes || patterns.hasEquals)) {
    return 'base64';
  }
  
  // Pattern 4: URL-safe Base64 (only alphanumeric, no special chars)
  if (patterns.onlyUrlSafeBase64 && patterns.onlyAlphanumeric && !patterns.hasEquals) {
    return 'base64-urlsafe';
  }
  
  // Pattern 5: Caesar cipher (has special chars like colons, dashes, slashes, underscores)
  if (patterns.hasSpecialChars && (patterns.hasColons || patterns.hasDashes || patterns.hasSlashes)) {
    return 'caesar';
  }
  
  // Pattern 6: Mixed special chars (dashes, underscores, equals)
  if (patterns.hasEquals && (patterns.hasDashes || patterns.hasUnderscores)) {
    return 'base64-urlsafe-padded';
  }
  
  // Default: try Caesar first
  return 'caesar';
}

/**
 * Decode hex with colons
 */
function decodeHexColon(encoded: string): string {
  return encoded
    .split(':')
    .map(hex => String.fromCharCode(parseInt(hex, 16)))
    .join('');
}

/**
 * Decode pure hex
 */
function decodeHex(encoded: string): string {
  let result = '';
  for (let i = 0; i < encoded.length; i += 2) {
    result += String.fromCharCode(parseInt(encoded.substr(i, 2), 16));
  }
  return result;
}

/**
 * Decode standard Base64 (Edge-compatible)
 */
function decodeBase64(encoded: string): string {
  // Use atob for browser/edge compatibility
  try {
    return atob(encoded);
  } catch (e) {
    // Fallback for Node.js environments
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(encoded, 'base64').toString('utf-8');
    }
    throw e;
  }
}

/**
 * Decode URL-safe Base64
 */
function decodeBase64UrlSafe(encoded: string): string {
  // Convert URL-safe to standard Base64
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  
  return decodeBase64(base64);
}

/**
 * Decode URL-safe Base64 with padding
 */
function decodeBase64UrlSafePadded(encoded: string): string {
  // Already has padding, just convert chars
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return decodeBase64(base64);
}

/**
 * Decode Caesar cipher (try multiple shifts)
 */
function decodeCaesar(encoded: string, shift: number = 3): string {
  return encoded
    .split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) - shift))
    .join('');
}

/**
 * Decode custom g/colon format (vidsrc-embed.ru specific)
 * 1. Replace 'g' with '8' and ':' with '/'
 * 2. Remove all non-hex characters
 * 3. Decode as hex pairs
 */
function decodeGColonFormat(encoded: string): string {
  // Step 1: Replace g→8 and :→/
  const replaced = encoded.replace(/g/g, '8').replace(/:/g, '/');
  
  // Step 2: Remove all non-hex characters
  const cleaned = replaced.replace(/[^0-9a-fA-F]/g, '');
  
  // Step 3: Decode hex pairs
  if (cleaned.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  
  let result = '';
  for (let i = 0; i < cleaned.length; i += 2) {
    result += String.fromCharCode(parseInt(cleaned.substr(i, 2), 16));
  }
  
  return result;
}

/**
 * Main decode function with automatic method detection
 * This is the primary export for client-side decoding
 */
export function decode(encoded: string): string {
  // First, try the custom g/colon format (most common for vidsrc-embed.ru)
  try {
    const gColonResult = decodeGColonFormat(encoded);
    if (gColonResult.includes('http')) {
      console.log(`[Client Decoder] ✅ Successfully decoded with g/colon format`);
      return gColonResult;
    }
  } catch (e) {
    // Continue to other methods
  }
  
  const patterns = detectEncodingPattern(encoded);
  const method = determineDecoderMethod(patterns);
  
  console.log(`[Client Decoder] Detected method: ${method}`);
  
  try {
    let result: string;
    
    switch (method) {
      case 'hex-colon':
        result = decodeHexColon(encoded);
        break;
      
      case 'hex':
        result = decodeHex(encoded);
        break;
      
      case 'base64':
        result = decodeBase64(encoded);
        break;
      
      case 'base64-urlsafe':
        result = decodeBase64UrlSafe(encoded);
        break;
      
      case 'base64-urlsafe-padded':
        result = decodeBase64UrlSafePadded(encoded);
        break;
      
      case 'caesar':
        // Try Caesar with shift 3 first
        result = decodeCaesar(encoded, 3);
        if (result.includes('http')) return result;
        
        // Try other shifts
        for (let shift = 1; shift <= 25; shift++) {
          if (shift === 3) continue;
          result = decodeCaesar(encoded, shift);
          if (result.includes('http')) return result;
        }
        break;
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    
    if (result && result.includes('http')) {
      console.log(`[Client Decoder] ✅ Successfully decoded with ${method}`);
      return result;
    }
    
    throw new Error(`Decoded result doesn't look like a URL`);
  } catch (error) {
    console.error(`[Client Decoder] Decode error with method ${method}:`, error);
    
    // Fallback: try all methods
    const methods: Array<() => string> = [
      () => decodeGColonFormat(encoded),
      () => decodeCaesar(encoded, 3),
      () => decodeHex(encoded),
      () => decodeBase64(encoded),
      () => decodeBase64UrlSafe(encoded),
      () => decodeHexColon(encoded)
    ];
    
    for (const methodFn of methods) {
      try {
        const result = methodFn();
        if (result && result.includes('http')) {
          console.log(`[Client Decoder] ✅ Fallback method succeeded`);
          return result;
        }
      } catch (e) {
        // Continue to next method
      }
    }
    
    throw new Error('All decode methods failed');
  }
}

/**
 * Export for testing/debugging
 */
export const decoderUtils = {
  detectEncodingPattern,
  determineDecoderMethod,
  decodeGColonFormat,
  decodeHexColon,
  decodeHex,
  decodeBase64,
  decodeBase64UrlSafe,
  decodeBase64UrlSafePadded,
  decodeCaesar
};
