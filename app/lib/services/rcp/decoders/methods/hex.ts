/**
 * Hexadecimal Decoders
 * 
 * Hex-based decoding methods for RCP hashes.
 */

import { DecoderMethod } from '../types';
import { validateUrl, isValidHex } from '../utils';

/**
 * Decode hex string to ASCII
 */
function hexToAscii(hex: string): string {
  const cleaned = hex.replace(/:/g, '').replace(/\s/g, '');
  let result = '';
  
  for (let i = 0; i < cleaned.length; i += 2) {
    const byte = cleaned.substr(i, 2);
    result += String.fromCharCode(parseInt(byte, 16));
  }
  
  return result;
}

/**
 * Simple hex decoder
 */
export const hexDecoder: DecoderMethod = {
  id: 'hex',
  name: 'Hexadecimal Decoder',
  category: 'hex',
  priority: 2,
  successRate: 0.20,
  avgTime: 2,
  description: 'Decodes hexadecimal strings to ASCII',
  
  fn: (input: string): string | null => {
    try {
      if (!isValidHex(input)) return null;
      
      const decoded = hexToAscii(input);
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};

/**
 * Hex with XOR decoder
 */
export const hexXorDecoder: DecoderMethod = {
  id: 'hex-xor',
  name: 'Hex XOR Decoder',
  category: 'hex',
  priority: 3,
  successRate: 0.15,
  avgTime: 3,
  requiresDivId: true,
  description: 'Decodes hex and applies XOR with divId',
  
  fn: (input: string, divId?: string): string | null => {
    try {
      if (!isValidHex(input)) return null;
      if (!divId) return null;
      
      const hexDecoded = hexToAscii(input);
      
      // Apply XOR with divId
      let result = '';
      for (let i = 0; i < hexDecoded.length; i++) {
        const charCode = hexDecoded.charCodeAt(i);
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
 * Double hex decoder (hex encoded twice)
 */
export const doubleHexDecoder: DecoderMethod = {
  id: 'double-hex',
  name: 'Double Hex Decoder',
  category: 'hex',
  priority: 5,
  successRate: 0.05,
  avgTime: 3,
  description: 'Decodes hex twice',
  
  fn: (input: string): string | null => {
    try {
      if (!isValidHex(input)) return null;
      
      const firstDecode = hexToAscii(input);
      if (!isValidHex(firstDecode)) return null;
      
      const secondDecode = hexToAscii(firstDecode);
      const validation = validateUrl(secondDecode);
      return validation.valid ? secondDecode : null;
    } catch {
      return null;
    }
  },
};

/**
 * Hex with double XOR
 */
export const hexDoubleXorDecoder: DecoderMethod = {
  id: 'hex-double-xor',
  name: 'Hex Double XOR Decoder',
  category: 'hex',
  priority: 4,
  successRate: 0.15,
  avgTime: 4,
  requiresDivId: true,
  description: 'Decodes hex and applies XOR twice',
  
  fn: (input: string, divId?: string): string | null => {
    try {
      if (!isValidHex(input)) return null;
      if (!divId) return null;
      
      const hexDecoded = hexToAscii(input);
      
      // First XOR pass
      let firstPass = '';
      for (let i = 0; i < hexDecoded.length; i++) {
        const charCode = hexDecoded.charCodeAt(i);
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
 * Export all hex decoders
 */
export const hexDecoders = [
  hexDecoder,
  hexXorDecoder,
  hexDoubleXorDecoder,
  doubleHexDecoder,
];
