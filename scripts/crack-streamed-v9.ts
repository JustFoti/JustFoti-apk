#!/usr/bin/env bun
/**
 * The XOR of encoded data doesn't match XOR of WHAT headers
 * This means the key derivation is more complex
 * 
 * Let's try:
 * 1. The key might be a hash of WHAT header
 * 2. The key might be WHAT header processed through some transformation
 * 3. There might be a secondary key involved
 */

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

async function fetchEncoded(source: string, id: string, streamNo: string) {
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
    body: protoBody,
  });

  const whatHeader = response.headers.get('what');
  if (!whatHeader) throw new Error('No WHAT header');
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  return { data: bytes.slice(idx), whatHeader };
}

// RC4 key scheduling
function rc4Init(key: Uint8Array): Uint8Array {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  return S;
}

// RC4 PRGA - generate keystream
function rc4Keystream(S: Uint8Array, length: number): Uint8Array {
  const keystream = new Uint8Array(length);
  let i = 0, j = 0;
  
  for (let k = 0; k < length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    keystream[k] = S[(S[i] + S[j]) % 256];
  }
  
  return keystream;
}

// Simple hash function
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Try to decode with various methods
async function tryDecode(data: Uint8Array, whatHeader: string): Promise<string | null> {
  const whatBytes = new TextEncoder().encode(whatHeader);
  const expectedStart = 'https://lb';
  
  // Method 1: RC4 with WHAT as key
  console.log('Trying RC4 with WHAT header...');
  const S1 = rc4Init(whatBytes);
  const keystream1 = rc4Keystream(S1, data.length);
  const decoded1 = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    decoded1[i] = data[i] ^ keystream1[i];
  }
  const result1 = new TextDecoder('utf-8', { fatal: false }).decode(decoded1);
  console.log('  Result:', result1.substring(0, 60));
  if (result1.startsWith(expectedStart)) return result1;
  
  // Method 2: RC4 with WHAT[7:] as key (skip "ISEEYO" prefix)
  console.log('Trying RC4 with WHAT[7:] as key...');
  const whatStripped = new TextEncoder().encode(whatHeader.substring(7));
  const S2 = rc4Init(whatStripped);
  const keystream2 = rc4Keystream(S2, data.length);
  const decoded2 = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    decoded2[i] = data[i] ^ keystream2[i];
  }
  const result2 = new TextDecoder('utf-8', { fatal: false }).decode(decoded2);
  console.log('  Result:', result2.substring(0, 60));
  if (result2.startsWith(expectedStart)) return result2;
  
  // Method 3: XOR with position-dependent key
  console.log('Trying position-dependent XOR...');
  for (let formula = 0; formula < 10; formula++) {
    const decoded = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      let keyByte: number;
      switch (formula) {
        case 0: keyByte = whatBytes[(i * 7) % whatBytes.length]; break;
        case 1: keyByte = whatBytes[(i * 11) % whatBytes.length]; break;
        case 2: keyByte = whatBytes[(i * 13) % whatBytes.length]; break;
        case 3: keyByte = (whatBytes[i % whatBytes.length] + i) % 256; break;
        case 4: keyByte = (whatBytes[i % whatBytes.length] ^ i) % 256; break;
        case 5: keyByte = whatBytes[(whatBytes.length - 1 - (i % whatBytes.length))]; break;
        case 6: keyByte = whatBytes[i % whatBytes.length] ^ whatBytes[(i + 1) % whatBytes.length]; break;
        case 7: keyByte = (whatBytes[i % whatBytes.length] * (i + 1)) % 256; break;
        case 8: keyByte = whatBytes[(i + whatBytes[i % whatBytes.length]) % whatBytes.length]; break;
        case 9: keyByte = whatBytes[i % whatBytes.length] ^ (i % 256); break;
        default: keyByte = whatBytes[i % whatBytes.length];
      }
      decoded[i] = data[i] ^ keyByte;
    }
    const result = new TextDecoder('utf-8', { fatal: false }).decode(decoded);
    if (result.startsWith(expectedStart) || result.includes('strmd.top')) {
      console.log(`  Formula ${formula} works!`);
      console.log('  Result:', result);
      return result;
    }
  }
  
  // Method 4: The data might be base64 encoded first
  console.log('Trying base64 decode first...');
  try {
    const dataStr = new TextDecoder().decode(data);
    // Try URL-safe base64
    const base64Fixed = dataStr.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64Fixed);
    console.log('  Base64 decoded:', decoded.substring(0, 60));
    
    // Then try XOR
    const decodedBytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      decodedBytes[i] = decoded.charCodeAt(i) ^ whatBytes[i % whatBytes.length];
    }
    const result = new TextDecoder('utf-8', { fatal: false }).decode(decodedBytes);
    console.log('  After XOR:', result.substring(0, 60));
    if (result.startsWith(expectedStart)) return result;
  } catch (e) {
    console.log('  Not valid base64');
  }
  
  // Method 5: Try different character set transformations
  console.log('Trying character set transformations...');
  
  // The encoded data is all printable ASCII (32-126)
  // Maybe it's a simple substitution cipher
  
  // Build a substitution table from WHAT header
  // WHAT is 32 chars, could define a mapping
  
  // Method 6: Analyze the relationship between WHAT and data
  console.log('\nAnalyzing WHAT header structure...');
  console.log('WHAT:', whatHeader);
  console.log('WHAT length:', whatHeader.length);
  console.log('WHAT prefix:', whatHeader.substring(0, 7)); // "ISEEYO" + one char
  console.log('WHAT suffix:', whatHeader.substring(7));
  
  // The WHAT header always starts with "ISEEYO" (7 chars including the next char)
  // The remaining 25 chars might be the actual key
  
  // Method 7: Try treating the data as a different encoding
  console.log('\nTrying to find patterns in data...');
  const dataStr = new TextDecoder().decode(data);
  
  // Check if data contains any recognizable patterns
  console.log('Data starts with:', dataStr.substring(0, 20));
  console.log('Data ends with:', dataStr.substring(dataStr.length - 20));
  
  // Look for URL-like patterns after simple transformations
  for (let shift = 1; shift < 128; shift++) {
    let shifted = '';
    for (let i = 0; i < Math.min(10, data.length); i++) {
      shifted += String.fromCharCode((data[i] + shift) % 128);
    }
    if (shifted.startsWith('https://') || shifted.startsWith('http://')) {
      console.log(`Shift ${shift} produces URL-like start:`, shifted);
    }
  }
  
  return null;
}

async function main() {
  const source = 'golf';
  const id = '18634';
  const streamNo = '1';
  
  console.log(`Fetching ${source}/${id}/${streamNo}...\n`);
  
  const { data, whatHeader } = await fetchEncoded(source, id, streamNo);
  
  console.log('WHAT header:', whatHeader);
  console.log('Data length:', data.length);
  console.log('Data (first 50):', new TextDecoder().decode(data).substring(0, 50));
  console.log('');
  
  const result = await tryDecode(data, whatHeader);
  
  if (result) {
    console.log('\n*** SUCCESS! ***');
    console.log('Decoded URL:', result);
  } else {
    console.log('\n*** No working decode method found ***');
    
    // Let's do a deeper analysis
    console.log('\n--- Deep Analysis ---');
    
    // The expected URL format:
    // https://lb{N}.strmd.top/secure/{32-char-token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
    // For golf/18634/1:
    // https://lb?.strmd.top/secure/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/golf/stream/18634/1/playlist.m3u8
    // Length: 10 + 1 + 18 + 32 + 1 + 4 + 8 + 5 + 1 + 1 + 14 = ~95 chars minimum
    
    const expectedLen = `https://lb1.strmd.top/secure/${'X'.repeat(32)}/golf/stream/18634/1/playlist.m3u8`.length;
    console.log('Expected URL length:', expectedLen);
    console.log('Actual data length:', data.length);
    
    // The data is 128 bytes, expected is ~95
    // There might be padding or the URL is longer
    
    // Let's try to find the XOR key by brute force
    // We know the first 10 chars should be "https://lb"
    console.log('\nBrute forcing first 10 bytes...');
    
    const expectedPrefix = 'https://lb';
    const derivedKey: number[] = [];
    
    for (let i = 0; i < expectedPrefix.length; i++) {
      derivedKey.push(data[i] ^ expectedPrefix.charCodeAt(i));
    }
    
    console.log('Derived key bytes:', derivedKey);
    console.log('Derived key as string:', derivedKey.map(b => String.fromCharCode(b)).join(''));
    
    // Check if derived key appears in WHAT header
    const derivedStr = derivedKey.map(b => String.fromCharCode(b)).join('');
    console.log('Derived key in WHAT:', whatHeader.includes(derivedStr) ? 'YES' : 'NO');
    
    // Check byte-by-byte relationship with WHAT
    console.log('\nByte-by-byte analysis:');
    for (let i = 0; i < Math.min(10, derivedKey.length); i++) {
      const dk = derivedKey[i];
      const whatByte = whatHeader.charCodeAt(i);
      const whatByte7 = whatHeader.charCodeAt(i + 7);
      console.log(`  Pos ${i}: derived=${dk} (${String.fromCharCode(dk)}), WHAT[${i}]=${whatByte} (${whatHeader[i]}), WHAT[${i+7}]=${whatByte7} (${whatHeader[i+7]})`);
      console.log(`    XOR with WHAT[${i}]: ${dk ^ whatByte}, XOR with WHAT[${i+7}]: ${dk ^ whatByte7}`);
    }
  }
}

main().catch(console.error);
