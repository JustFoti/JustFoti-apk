/**
 * XOR Decoders
 * 
 * XOR-based decoding methods using divId as key.
 */

import { DecoderMethod } from '../types';
import { validateUrl } from '../utils';
import { XOR_KEYS } from '../constants';

/**
 * XOR with divId
 */
export const xorDivIdDecoder: DecoderMethod = {
  id: 'xor-divid',
  name: 'XOR with DivID',
  category: 'xor',
  priority: 2,
  successRate: 0.20,
  avgTime: 2,
  requiresDivId: true,
  description: 'XOR decoding using divId as key',
  
  fn: (input: string, divId?: string): string | null => {
    try {
      if (!divId) return null;
      
      let result = '';
      for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        const keyChar = divId.charCodeAt(i % divId.length);
        result += String.fromCharCode(charCode ^ keyChar);
      }
      
      const validation = validateUrl(result);
      return validation.valid ? result : null;
    } catch {
      return null;
    }
  },
};

/**
 * XOR with fixed key
 */
export const xorFixedKeyDecoder: DecoderMethod = {
  id: 'xor-fixed-key',
  name: 'XOR with Fixed Key',
  category: 'xor',
  priority: 5,
  successRate: 0.05,
  avgTime: 3,
  description: 'XOR decoding with known fixed keys',
  
  fn: (input: string): string | null => {
    try {
      for (const key of XOR_KEYS) {
        const keyStr = typeof key === 'string' ? key : String.fromCharCode(key);
        
        let result = '';
        for (let i = 0; i < input.length; i++) {
          const charCode = input.charCodeAt(i);
          const keyChar = keyStr.charCodeAt(i % keyStr.length);
          result += String.fromCharCode(charCode ^ keyChar);
        }
        
        const validation = validateUrl(result);
        if (validation.valid) return result;
      }
      
      return null;
    } catch {
      return null;
    }
  },
};

/**
 * XOR then Caesar
 */
export const xorCaesarDecoder: DecoderMethod = {
  id: 'xor-caesar',
  name: 'XOR + Caesar Decoder',
  category: 'composite',
  priority: 6,
  successRate: 0.08,
  avgTime: 4,
  requiresDivId: true,
  description: 'XOR with divId then applies ROT-3',
  
  fn: (input: string, divId?: string): string | null => {
    try {
      if (!divId) return null;
      
      // XOR pass
      let xorResult = '';
      for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        const keyChar = divId.charCodeAt(i % divId.length);
        xorResult += String.fromCharCode(charCode ^ keyChar);
      }
      
      // Caesar pass (ROT-3)
      const caesarResult = xorResult
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
      
      const validation = validateUrl(caesarResult);
      return validation.valid ? caesarResult : null;
    } catch {
      return null;
    }
  },
};

/**
 * Double XOR with divId
 */
export const doubleXorDecoder: DecoderMethod = {
  id: 'double-xor',
  name: 'Double XOR Decoder',
  category: 'xor',
  priority: 4,
  successRate: 0.10,
  avgTime: 3,
  requiresDivId: true,
  description: 'Applies XOR with divId twice',
  
  fn: (input: string, divId?: string): string | null => {
    try {
      if (!divId) return null;
      
      // First XOR pass
      let firstPass = '';
      for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        const keyChar = divId.charCodeAt(i % divId.length);
        firstPass += String.fromCharCode(charCode ^ keyChar);
      }
      
      // Second XOR pass
      let secondPass = '';
      for (let i = 0; i < firstPass.length; i++) {
        const charCode = firstPass.charCodeAt(i);
        const keyChar = divId.charCodeAt(i % divId.length);
        secondPass += String.fromCharCode(charCode ^ keyChar);
      }
      
      const validation = validateUrl(secondPass);
      return validation.valid ? secondPass : null;
    } catch {
      return null;
    }
  },
};

/**
 * XOR with Base64
 */
export const xorBase64Decoder: DecoderMethod = {
  id: 'xor-base64',
  name: 'XOR + Base64 Decoder',
  category: 'composite',
  priority: 7,
  successRate: 0.05,
  avgTime: 4,
  requiresDivId: true,
  description: 'XOR with divId then decodes Base64',
  
  fn: (input: string, divId?: string): string | null => {
    try {
      if (!divId) return null;
      
      // XOR pass
      let xorResult = '';
      for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i);
        const keyChar = divId.charCodeAt(i % divId.length);
        xorResult += String.fromCharCode(charCode ^ keyChar);
      }
      
      // Base64 decode
      const decoded = Buffer.from(xorResult, 'base64').toString('utf-8');
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};

/**
 * Export all XOR decoders
 */
export const xorDecoders = [
  xorDivIdDecoder,
  xorFixedKeyDecoder,
  xorCaesarDecoder,
  doubleXorDecoder,
  xorBase64Decoder,
];
