#!/usr/bin/env bun
/**
 * Decode the streamed URL using the discovered algorithm
 * 
 * The decoding process:
 * 1. Fetch /fetch endpoint with protobuf body
 * 2. Get WHAT header and response body
 * 3. Parse protobuf to get encoded data
 * 4. Apply ROT13-like transformation
 * 5. AES decrypt with WHAT header as key
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
        // This is the encoded data
        return String.fromCharCode(...bytes.slice(idx, idx + length));
      }
      
      idx += length;
    } else if (wireType === 0) { // Varint
      while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
      idx++;
    }
  }
  
  throw new Error('No encoded data found in protobuf');
}

/**
 * ROT13-like transformation (from the obfuscated code)
 * Characters A-Z and a-z are rotated by 13
 */
function rot13Transform(str: string): string {
  return str.split('').map(char => {
    const code = char.charCodeAt(0);
    // Uppercase A-Z (65-90)
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(65 + (code - 65 + 13) % 26);
    }
    // Lowercase a-z (97-122)
    if (code >= 97 && code <= 122) {
      return String.fromCharCode(97 + (code - 97 + 13) % 26);
    }
    return char;
  }).join('');
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
    
    // Parse protobuf to get encoded data
    const encodedData = parseProtobuf(bytes);
    console.log('Encoded data:', encodedData);
    console.log('Encoded data length:', encodedData.length);
    
    // Try different decoding methods
    
    // Method 1: ROT13 then AES decrypt
    console.log('\n--- Method 1: ROT13 then AES decrypt ---');
    const rot13Data = rot13Transform(encodedData);
    console.log('ROT13 transformed:', rot13Data.substring(0, 50));
    
    try {
      const decrypted1 = CryptoJS.AES.decrypt(rot13Data, CryptoJS.enc.Utf8.parse(whatHeader), {
        mode: CryptoJS.mode.CBC,
        iv: CryptoJS.enc.Utf8.parse('0000000000000000'),
        padding: CryptoJS.pad.Pkcs7,
      });
      const result1 = decrypted1.toString(CryptoJS.enc.Utf8);
      console.log('Decrypted:', result1.substring(0, 100));
      if (result1.includes('strmd.top')) {
        return result1;
      }
    } catch (e) {
      console.log('Method 1 failed:', (e as Error).message);
    }
    
    // Method 2: Direct AES decrypt with WHAT as key
    console.log('\n--- Method 2: Direct AES decrypt ---');
    try {
      const decrypted2 = CryptoJS.AES.decrypt(encodedData, whatHeader);
      const result2 = decrypted2.toString(CryptoJS.enc.Utf8);
      console.log('Decrypted:', result2.substring(0, 100));
      if (result2.includes('strmd.top')) {
        return result2;
      }
    } catch (e) {
      console.log('Method 2 failed:', (e as Error).message);
    }
    
    // Method 3: Base64 decode then AES
    console.log('\n--- Method 3: Base64 decode then AES ---');
    try {
      const base64Decoded = atob(encodedData);
      console.log('Base64 decoded:', base64Decoded.substring(0, 50));
      
      const decrypted3 = CryptoJS.AES.decrypt(
        CryptoJS.lib.CipherParams.create({
          ciphertext: CryptoJS.enc.Latin1.parse(base64Decoded)
        }),
        CryptoJS.enc.Utf8.parse(whatHeader),
        {
          mode: CryptoJS.mode.CBC,
          iv: CryptoJS.enc.Utf8.parse('0000000000000000'),
          padding: CryptoJS.pad.Pkcs7,
        }
      );
      const result3 = decrypted3.toString(CryptoJS.enc.Utf8);
      console.log('Decrypted:', result3.substring(0, 100));
      if (result3.includes('strmd.top')) {
        return result3;
      }
    } catch (e) {
      console.log('Method 3 failed:', (e as Error).message);
    }
    
    // Method 4: XOR with WHAT header
    console.log('\n--- Method 4: XOR with WHAT header ---');
    let xorResult = '';
    for (let i = 0; i < encodedData.length; i++) {
      xorResult += String.fromCharCode(encodedData.charCodeAt(i) ^ whatHeader.charCodeAt(i % whatHeader.length));
    }
    console.log('XOR result:', xorResult.substring(0, 100));
    if (xorResult.includes('strmd.top') || xorResult.includes('http')) {
      return xorResult;
    }
    
    // Method 5: ROT13 on XOR result
    console.log('\n--- Method 5: XOR then ROT13 ---');
    const rot13XorResult = rot13Transform(xorResult);
    console.log('ROT13 of XOR:', rot13XorResult.substring(0, 100));
    if (rot13XorResult.includes('strmd.top') || rot13XorResult.includes('http')) {
      return rot13XorResult;
    }
    
    // Method 6: Try AES with different modes
    console.log('\n--- Method 6: AES ECB mode ---');
    try {
      const decrypted6 = CryptoJS.AES.decrypt(
        CryptoJS.lib.CipherParams.create({
          ciphertext: CryptoJS.enc.Latin1.parse(encodedData)
        }),
        CryptoJS.enc.Utf8.parse(whatHeader),
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7,
        }
      );
      const result6 = decrypted6.toString(CryptoJS.enc.Utf8);
      console.log('Decrypted:', result6.substring(0, 100));
      if (result6.includes('strmd.top')) {
        return result6;
      }
    } catch (e) {
      console.log('Method 6 failed:', (e as Error).message);
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
