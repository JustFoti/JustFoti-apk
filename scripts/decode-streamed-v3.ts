#!/usr/bin/env bun
/**
 * Decode the streamed URL - v3
 * 
 * From the captured setStream function, the decoding involves:
 * 1. Parse protobuf to get encoded data
 * 2. Apply ROT13-like transformation on each character
 * 3. AES decrypt with WHAT header as key
 */

import CryptoJS from 'crypto-js';

const EMBED_BASE = 'https://embedsports.top';

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

function parseProtobuf(bytes: Uint8Array): string {
  // First byte is tag (0x0a = field 1, wire type 2)
  // Second byte is length (could be varint)
  let idx = 1;
  let length = 0;
  let shift = 0;
  
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) {
    length |= (bytes[idx] & 0x7f) << shift;
    shift += 7;
    idx++;
  }
  length |= (bytes[idx] & 0x7f) << shift;
  idx++;
  
  console.log('Protobuf: tag=1, length=', length, 'data starts at', idx);
  
  return String.fromCharCode(...bytes.slice(idx, idx + length));
}

/**
 * ROT13-like transformation from the obfuscated code
 * The code shows: charCode >= 65 && charCode <= 90 -> 65 + (charCode - 65 + 13) % 26
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

async function decodeStreamUrl(source: string, id: string, streamNo: string): Promise<string | null> {
  const protoBody = encodeProtobuf(source, id, streamNo);
  
  const response = await fetch(`${EMBED_BASE}/fetch`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Content-Type': 'application/octet-stream',
      'Origin': EMBED_BASE,
      'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
    },
    body: protoBody,
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
  
  // From the obfuscated code, the decoding is:
  // 1. Get the data from protobuf
  // 2. Apply ROT13 transformation
  // 3. AES decrypt with WHAT header
  
  // Step 1: ROT13 transform
  const rot13Data = rot13Transform(encodedData);
  console.log('\nROT13 transformed:', rot13Data);
  
  // Step 2: Try AES decrypt with different configurations
  console.log('\n--- Trying AES decryption ---');
  
  // The obfuscated code shows:
  // nby2moa[vEC4vmp(vir8fbO[0x223])][vEC4vmp(vir8fbO[0x224])](feeVxB, ...)
  // This is CryptoJS.AES.decrypt(ciphertext, key, options)
  
  // Try with WHAT header as passphrase (CryptoJS will derive key)
  try {
    const decrypted = CryptoJS.AES.decrypt(rot13Data, whatHeader);
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    console.log('AES decrypt (passphrase):', result.substring(0, 100));
    if (result.includes('strmd.top')) {
      return result;
    }
  } catch (e) {
    console.log('AES passphrase failed');
  }
  
  // Try with WHAT header as raw key (UTF8)
  try {
    const key = CryptoJS.enc.Utf8.parse(whatHeader);
    const iv = CryptoJS.enc.Utf8.parse('0000000000000000');
    
    const decrypted = CryptoJS.AES.decrypt(rot13Data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    console.log('AES decrypt (raw key, CBC):', result.substring(0, 100));
    if (result.includes('strmd.top')) {
      return result;
    }
  } catch (e) {
    console.log('AES raw key CBC failed');
  }
  
  // Try with the encoded data directly (not ROT13)
  try {
    const decrypted = CryptoJS.AES.decrypt(encodedData, whatHeader);
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    console.log('AES decrypt (no ROT13):', result.substring(0, 100));
    if (result.includes('strmd.top')) {
      return result;
    }
  } catch (e) {
    console.log('AES no ROT13 failed');
  }
  
  // The obfuscated code also shows:
  // nby2moa[vEC4vmp(vir8fbO[0x225])][vEC4vmp(vir8fbO[0x226])][vEC4vmp(vir8fbO[0x227])](Rs7dPF)
  // This is CryptoJS.enc.Utf8.parse(whatHeader) - so the key is parsed as UTF8
  
  // And: nby2moa[vEC4vmp(vir8fbO[0x228])][vEC4vmp(vir8fbO[0x229])]
  // This is CryptoJS.mode.CBC
  
  // And: nby2moa[vEC4vmp(vir8fbO[0x22c])][vEC4vmp(vir8fbO[0x22d])+vEC4vmp(vir8fbO[0x22e])]
  // This is CryptoJS.pad.Pkcs7
  
  // The IV is: vEC4vmp(vir8fbO[0x22a]) which is a constant string
  
  // Let me try with different IV values
  const ivOptions = [
    '0000000000000000',
    whatHeader.substring(0, 16),
    '1234567890123456',
    '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00',
  ];
  
  for (const ivStr of ivOptions) {
    try {
      const key = CryptoJS.enc.Utf8.parse(whatHeader);
      const iv = CryptoJS.enc.Utf8.parse(ivStr);
      
      const decrypted = CryptoJS.AES.decrypt(rot13Data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      if (result && result.length > 0) {
        console.log(`AES with IV "${ivStr.substring(0, 16)}":`, result.substring(0, 100));
        if (result.includes('strmd.top')) {
          return result;
        }
      }
    } catch (e) {
      // Ignore
    }
  }
  
  console.log('\nNo decoding method worked');
  return null;
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
