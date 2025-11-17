/**
 * Base64 Decoders
 * 
 * Base64 and URL-safe Base64 decoding methods.
 */

import { DecoderMethod } from '../types';
import { validateUrl, isValidBase64 } from '../utils';

/**
 * Standard Base64 decoder
 */
export const base64Decoder: DecoderMethod = {
  id: 'base64',
  name: 'Base64 Decoder',
  category: 'base64',
  priority: 4,
  successRate: 0.10,
  avgTime: 2,
  description: 'Standard Base64 decoding',
  
  fn: (input: string): string | null => {
    try {
      if (!isValidBase64(input, false)) return null;
      
      const decoded = Buffer.from(input, 'base64').toString('utf-8');
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};

/**
 * URL-safe Base64 decoder
 */
export const urlSafeBase64Decoder: DecoderMethod = {
  id: 'url-safe-base64',
  name: 'URL-Safe Base64 Decoder',
  category: 'base64',
  priority: 3,
  successRate: 0.12,
  avgTime: 2,
  description: 'URL-safe Base64 decoding (- and _ instead of + and /)',
  
  fn: (input: string): string | null => {
    try {
      if (!isValidBase64(input, true)) return null;
      
      // Convert URL-safe to standard Base64
      const standard = input.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(standard, 'base64').toString('utf-8');
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};

/**
 * Reverse then Base64 decode
 */
export const reverseBase64Decoder: DecoderMethod = {
  id: 'reverse-base64',
  name: 'Reverse Base64 Decoder',
  category: 'base64',
  priority: 5,
  successRate: 0.10,
  avgTime: 3,
  description: 'Reverses string then decodes Base64',
  
  fn: (input: string): string | null => {
    try {
      const reversed = input.split('').reverse().join('');
      if (!isValidBase64(reversed, false)) return null;
      
      const decoded = Buffer.from(reversed, 'base64').toString('utf-8');
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};

/**
 * Base64 decode then Caesar shift
 */
export const base64CaesarDecoder: DecoderMethod = {
  id: 'base64-caesar',
  name: 'Base64 + Caesar Decoder',
  category: 'composite',
  priority: 6,
  successRate: 0.08,
  avgTime: 4,
  description: 'Decodes Base64 then applies ROT-3',
  
  fn: (input: string): string | null => {
    try {
      if (!isValidBase64(input, false)) return null;
      
      const decoded = Buffer.from(input, 'base64').toString('utf-8');
      
      // Apply ROT-3
      const shifted = decoded
        .split('')
        .map(char => {
          const code = char.charCodeAt(0);
          if (code >= 65 && code <= 90) {
            return String.fromCharCode(((code - 65 - 3 + 26) % 26) + 65);
          }
          if (code >= 97 && code <= 122) {
            return String.fromCharCode(((code - 97 - 3 + 26) % 26) + 97);
          }
          return char;
        })
        .join('');
      
      const validation = validateUrl(shifted);
      return validation.valid ? shifted : null;
    } catch {
      return null;
    }
  },
};

/**
 * Reverse Base64 with substitution
 */
export const reverseBase64SubDecoder: DecoderMethod = {
  id: 'reverse-base64-sub3',
  name: 'Reverse Base64 + Substitution',
  category: 'composite',
  priority: 4,
  successRate: 0.15,
  avgTime: 4,
  description: 'Reverses, decodes Base64, then applies character substitution',
  
  fn: (input: string): string | null => {
    try {
      const reversed = input.split('').reverse().join('');
      if (!isValidBase64(reversed, false)) return null;
      
      const decoded = Buffer.from(reversed, 'base64').toString('utf-8');
      
      // Apply substitution (subtract 3 from each character)
      const substituted = decoded
        .split('')
        .map(char => String.fromCharCode(char.charCodeAt(0) - 3))
        .join('');
      
      const validation = validateUrl(substituted);
      return validation.valid ? substituted : null;
    } catch {
      return null;
    }
  },
};

/**
 * Double Base64 decoder
 */
export const doubleBase64Decoder: DecoderMethod = {
  id: 'double-base64',
  name: 'Double Base64 Decoder',
  category: 'base64',
  priority: 7,
  successRate: 0.03,
  avgTime: 3,
  description: 'Decodes Base64 twice',
  
  fn: (input: string): string | null => {
    try {
      if (!isValidBase64(input, false)) return null;
      
      const firstDecode = Buffer.from(input, 'base64').toString('utf-8');
      if (!isValidBase64(firstDecode, false)) return null;
      
      const secondDecode = Buffer.from(firstDecode, 'base64').toString('utf-8');
      const validation = validateUrl(secondDecode);
      return validation.valid ? secondDecode : null;
    } catch {
      return null;
    }
  },
};

/**
 * Export all Base64 decoders
 */
export const base64Decoders = [
  base64Decoder,
  urlSafeBase64Decoder,
  reverseBase64Decoder,
  base64CaesarDecoder,
  reverseBase64SubDecoder,
  doubleBase64Decoder,
];
