/**
 * MegaUp Native Decryption
 * 
 * This module provides native decryption for MegaUp encrypted video sources,
 * eliminating the dependency on enc-dec.app.
 * 
 * The encryption uses a stream cipher where the keystream depends on the User-Agent.
 * We use a fixed UA and its corresponding keystream for consistent decryption.
 */

// Fixed User-Agent for MegaUp requests
export const MEGAUP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Pre-computed keystream for the fixed UA (521 bytes)
const MEGAUP_KEYSTREAM_HEX = 'dece4f239861eb1c7d83f86c2fb5d27e557a3fd2696781674b986f9ed5d55cb028abc5e482a02a7c03d7ee811eb7bd6ad1dba549a20e53f564208b9d5d2e28b0797f6c6e547b5ce423bbc44be596b6ad536b9edea25a6bf97ed7fe1f36298ff1a2999ace34849e30ff894c769c2cf89e2805ddb1a4e62cf1346e3eff50b915abeb3b05f42125fe1e42b27995e76d6bc69e012c03df0e0a75a027b5be1336e1d63eb1b87816a7557b893171688ee2203ab95aee224fa555ce5558d721316a7d87fe40dd6e0fdf845a4526c879aab22e307266c27946838b311826711fd0005746e99e4c319e8556c4f953d1ea00673c9266865c5245ad5cf39ac63d73287fdb199ca3751a61e9a9aff9a64e7e47af1d1addacd2821d29a00615bfa87bfa732e10a1a525981f2734d5f6c98287d30a0ff7e0b2ad598aa2fb7bf3588aa81f75b77a1c0dd0f67180ef6726d1d7394704cee33c430f0c859305da5dfe8c59ee69b6bdeace85537a0ec7cbe1fcf79334fd0a470ba980429c88828ee9c57528730f51e3eaceb2c80b3d4c6d9844ca8de1ca834950028247825b437d7d5ffb79674e874e041df103d37f003891b62c26546ed0307a2516d22866ab95ee46e711f13896d065bb7752ae8fb8ecfac03ac0f2b53e3efdc942c8532736913a0ff51bc51db845d4c6b9300daeb80b2dc5a66f55807f1d1bf327de4c00cfb176c2d24be8b860fcc0c46752aa7e3dbbd6';

// Lazy-loaded keystream buffer
let keystreamBuffer: Buffer | null = null;

function getKeystream(): Buffer {
  if (!keystreamBuffer) {
    keystreamBuffer = Buffer.from(MEGAUP_KEYSTREAM_HEX, 'hex');
  }
  return keystreamBuffer;
}

/**
 * Decrypts MegaUp encrypted data using native implementation.
 * 
 * @param encryptedBase64 - The encrypted data in URL-safe base64 format
 * @returns The decrypted JSON string
 */
export function decryptMegaUp(encryptedBase64: string): string {
  const keystream = getKeystream();
  
  // Convert from URL-safe base64 to standard base64
  const base64 = encryptedBase64.replace(/-/g, '+').replace(/_/g, '/');
  const encBytes = Buffer.from(base64, 'base64');
  
  // XOR decrypt with keystream
  const decLength = Math.min(keystream.length, encBytes.length);
  const decBytes = Buffer.alloc(decLength);
  
  for (let i = 0; i < decLength; i++) {
    decBytes[i] = encBytes[i] ^ keystream[i];
  }
  
  const result = decBytes.toString('utf8');
  
  // Find the last valid JSON (handles minor tail variations)
  // The decrypted data should be valid JSON ending with "}"
  for (let i = result.length; i > 0; i--) {
    const substr = result.substring(0, i);
    if (substr.endsWith('}')) {
      try {
        JSON.parse(substr);
        return substr;
      } catch {
        // Continue searching
      }
    }
  }
  
  // Return as-is if no valid JSON found
  return result;
}

/**
 * Parses decrypted MegaUp response into structured data.
 * 
 * @param decrypted - The decrypted JSON string
 * @returns Parsed MegaUp response with sources and tracks
 */
export interface MegaUpSource {
  file: string;
  type?: string;
  label?: string;
}

export interface MegaUpTrack {
  file: string;
  kind: string;
  label?: string;
  default?: boolean;
}

export interface MegaUpResponse {
  sources: MegaUpSource[];
  tracks: MegaUpTrack[];
}

export function parseMegaUpResponse(decrypted: string): MegaUpResponse | null {
  try {
    const data = JSON.parse(decrypted);
    return {
      sources: data.sources || [],
      tracks: data.tracks || []
    };
  } catch {
    return null;
  }
}
