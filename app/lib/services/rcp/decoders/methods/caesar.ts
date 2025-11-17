/**
 * Caesar Cipher Decoders
 * 
 * ROT-N cipher implementations for decoding RCP hashes.
 */

import { DecoderMethod } from '../types';
import { CAESAR_SHIFTS } from '../constants';
import { validateUrl } from '../utils';

/**
 * Apply Caesar cipher shift
 */
function caesarShift(str: string, shift: number): string {
  return str
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      
      // Uppercase letters
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
      }
      
      // Lowercase letters
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
      }
      
      // Non-alphabetic characters remain unchanged
      return char;
    })
    .join('');
}

/**
 * ROT-23 decoder (most common)
 */
export const rot23Decoder: DecoderMethod = {
  id: 'rot23',
  name: 'ROT-23 Caesar Cipher',
  category: 'caesar',
  priority: 1,
  successRate: 0.25,
  avgTime: 1,
  description: 'Applies ROT-23 (Caesar shift of 3 backwards)',
  
  fn: (input: string): string | null => {
    try {
      const decoded = caesarShift(input, -3);
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};

/**
 * ROT-3 decoder
 */
export const rot3Decoder: DecoderMethod = {
  id: 'rot3',
  name: 'ROT-3 Caesar Cipher',
  category: 'caesar',
  priority: 2,
  successRate: 0.10,
  avgTime: 1,
  description: 'Applies ROT-3 (Caesar shift of 3 forwards)',
  
  fn: (input: string): string | null => {
    try {
      const decoded = caesarShift(input, 3);
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};

/**
 * ROT-13 decoder (classic)
 */
export const rot13Decoder: DecoderMethod = {
  id: 'rot13',
  name: 'ROT-13 Caesar Cipher',
  category: 'caesar',
  priority: 3,
  successRate: 0.05,
  avgTime: 1,
  description: 'Applies ROT-13 (Caesar shift of 13)',
  
  fn: (input: string): string | null => {
    try {
      const decoded = caesarShift(input, 13);
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};

/**
 * Generic Caesar decoder - tries all shifts
 */
export const caesarBruteForceDecoder: DecoderMethod = {
  id: 'caesar-brute-force',
  name: 'Caesar Brute Force',
  category: 'caesar',
  priority: 10,
  successRate: 0.15,
  avgTime: 5,
  description: 'Tries all possible Caesar shifts',
  
  fn: (input: string): string | null => {
    try {
      for (const shift of CAESAR_SHIFTS) {
        const decoded = caesarShift(input, shift);
        const validation = validateUrl(decoded);
        if (validation.valid) {
          return decoded;
        }
      }
      return null;
    } catch {
      return null;
    }
  },
};

/**
 * Export all Caesar decoders
 */
export const caesarDecoders = [
  rot23Decoder,
  rot3Decoder,
  rot13Decoder,
  caesarBruteForceDecoder,
];
