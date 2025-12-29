#!/usr/bin/env bun
/**
 * Decode the streamed URL using the actual algorithm from the obfuscated code
 * 
 * From the setStream function, the decoding involves:
 * 1. Custom base91-like decoding
 * 2. ROT13-like character rotation
 * 3. AES decryption with WHAT header as key
 */

import CryptoJS from 'crypto-js';

const EMBED_BASE = 'https://embedsports.top';

/**
 * Encode protobuf request body
 */
function encodeProtobuf(source: string, id: string, streamNo: string): Uint8Array {
  const sourceBytes = new TextEncoder().encode(source);
  const idBytes = new TextEncoder().encode(id);
  const streamNoBytes = new TextEncoder().encode(streamNo);
  
  const result: number[] = [];
  result.push(0x0a, sourceBytes.length, ...sourceBytes);
  result.push(0x12, idBytes.length, ...idBytes);
  result.push(0x1a, streamNoBytes.length, ...streamNoBytes);
  
  return new Uint8Array(result);
}

/**
 * Parse protobuf response to get the encoded data
 */
function parseProtobuf(bytes: Uint8Array): string {
  let idx = 0;
  
  while (idx < bytes.length) {
    const tag = bytes[idx] >> 3;
    const wireType = bytes[idx] & 0x07;
    idx++;
    
    if (wireType === 2) { // Length-delimited
      let length = 0;
      let shift = 0;
      while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) {
        length |= (bytes[idx] & 0x7f) << shift;
        shift += 7;
        idx++;
      }
      length |= (bytes[idx] & 0x7f) << shift;
      idx++;
      
      if (tag === 1) {
        return String.fromCharCode(...bytes.slice(idx, idx + length));
      }
      
      idx += length;
    } else if (wireType === 0) {
      while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
      idx++;
    }
  }
  
  throw new Error('No encoded data found in protobuf');
}

/**
 * Base91-like decode (from the obfuscated code)
 * The alphabet is: KfZ&S[`>W^|3/R:(h<XD;@Gs)4^Ee:`9<f=`E^J~AEx6uG4^bA2ad}sD`yI?^5<zAa=)6b%C9;<2Zxw!%5+H
 */
function base91Decode(input: string, alphabet: string): Uint8Array {
  const result: number[] = [];
  let acc = 0;
  let bits = 0;
  let v = -1;
  
  for (let i = 0; i < input.length; i++) {
    const p = alphabet.indexOf(input[i]);
    if (p === -1) continue;
    
    if (v < 0) {
      v = p;
    } else {
      v += p * 91;
      acc |= v << bits;
      bits += (v & 8191) > 88 ? 13 : 14;
      
      do {
        result.push(acc & 255);
        acc >>= 8;
        bits -= 8;
      } while (bits > 7);
      
      v = -1;
    }
  }
  
  if (v > -1) {
    result.push((acc | v << bits) & 255);
  }
  
  return new Uint8Array(result);
}

/**
 * ROT13-like transformation
 */
function rot13(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(65 + (code - 65 + 13) % 26);
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(97 + (code - 97 + 13) % 26);
  }
  return char;
}

/**
 * Decode the stream URL
 */
async function decodeStreamUrl(source: string, id: string, streamNo: string): Promise<string | null> {
  try {
    const protoBody = encodeProtobuf(source, id, streamNo);
    
    const response = await fetch(`${EMBED_BASE}/fetch`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Content-Type': 'application/octet-stream',
        'Origin': EMBED_BASE,
        'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
      },
      body: Buffer.from(protoBody),
    });

    const whatHeader = response.headers.get('what');
    if (!whatHeader || !response.ok) {
      console.log('No WHAT header or response not OK');
      return null;
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    console.log('WHAT header:', whatHeader);
    console.log('Response bytes:', bytes.length);
    
    const encodedData = parseProtobuf(bytes);
    console.log('Encoded data:', encodedData);
    console.log('Encoded data length:', encodedData.length);
    
    // From the obfuscated code, the alphabet used is:
    // "AM6}P_)=|[p@<:]/Z?K.,9*+;a8`1^xJOvU{~>"5IlugeqEoG4jz#fkVcsX3BFrYR0Cb7d!SDweW2nimhTyHQNt$%&("
    // This is one of the alphabets used in the base91-like decoding
    
    const alphabets = [
      'KfZ&S[`>W^|3/R:(h<XD;@Gs)4^Ee:`9<f=`E^J~AEx6uG4^bA2ad}sD`yI?^5<zAa=)6b%C9;<2Zxw!%5+H',
      'AM6}P_)=|[p@<:]/Z?K.,9*+;a8`1^xJOvU{~>"5IlugeqEoG4jz#fkVcsX3BFrYR0Cb7d!SDweW2nimhTyHQNt$%&(',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    ];
    
    for (const alphabet of alphabets) {
      console.log(`\n--- Trying alphabet: ${alphabet.substring(0, 30)}... ---`);
      
      try {
        const decoded = base91Decode(encodedData, alphabet);
        const decodedStr = new TextDecoder().decode(decoded);
        console.log('Base91 decoded:', decodedStr.substring(0, 100));
        
        // Try ROT13 on the result
        const rot13Result = decodedStr.split('').map(rot13).join('');
        console.log('ROT13:', rot13Result.substring(0, 100));
        
        // Try AES decrypt
        try {
          const decrypted = CryptoJS.AES.decrypt(rot13Result, CryptoJS.enc.Utf8.parse(whatHeader), {
            mode: CryptoJS.mode.CBC,
            iv: CryptoJS.enc.Utf8.parse('0000000000000000'),
            padding: CryptoJS.pad.Pkcs7,
          });
          const result = decrypted.toString(CryptoJS.enc.Utf8);
          console.log('AES decrypted:', result.substring(0, 100));
          if (result.includes('strmd.top')) {
            return result;
          }
        } catch (e) {
          // Try with the decoded bytes directly
          try {
            const decrypted = CryptoJS.AES.decrypt(
              CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.lib.WordArray.create(decoded as any)
              }),
              CryptoJS.enc.Utf8.parse(whatHeader),
              {
                mode: CryptoJS.mode.CBC,
                iv: CryptoJS.enc.Utf8.parse('0000000000000000'),
                padding: CryptoJS.pad.Pkcs7,
              }
            );
            const result = decrypted.toString(CryptoJS.enc.Utf8);
            console.log('AES decrypted (bytes):', result.substring(0, 100));
            if (result.includes('strmd.top')) {
              return result;
            }
          } catch (e2) {
            console.log('AES failed');
          }
        }
      } catch (e) {
        console.log('Base91 decode failed:', (e as Error).message);
      }
    }
    
    // Try direct AES with the encoded data as base64
    console.log('\n--- Trying direct AES with base64 ---');
    try {
      // The encoded data might already be in a format CryptoJS can handle
      const decrypted = CryptoJS.AES.decrypt(encodedData, whatHeader);
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      console.log('Direct AES:', result.substring(0, 100));
      if (result.includes('strmd.top')) {
        return result;
      }
    } catch (e) {
      console.log('Direct AES failed');
    }
    
    // Try with the raw bytes
    console.log('\n--- Trying AES with raw bytes ---');
    const encodedBytes = new TextEncoder().encode(encodedData);
    try {
      const wordArray = CryptoJS.lib.WordArray.create(encodedBytes as any);
      const decrypted = CryptoJS.AES.decrypt(
        CryptoJS.lib.CipherParams.create({ ciphertext: wordArray }),
        CryptoJS.enc.Utf8.parse(whatHeader),
        {
          mode: CryptoJS.mode.CBC,
          iv: CryptoJS.enc.Utf8.parse(whatHeader.substring(0, 16)),
          padding: CryptoJS.pad.Pkcs7,
        }
      );
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      console.log('AES with raw bytes:', result.substring(0, 100));
      if (result.includes('strmd.top')) {
        return result;
      }
    } catch (e) {
      console.log('AES with raw bytes failed');
    }
    
    console.log('\nNo decoding method worked');
    return null;
    
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Test
const source = 'alpha';
const id = 'nba-tv-1';
const streamNo = '1';

console.log(`Decoding stream URL for ${source}/${id}/${streamNo}...\n`);
decodeStreamUrl(source, id, streamNo).then(url => {
  console.log('\n=== Final Result ===');
  console.log('Decoded URL:', url);
});
