#!/usr/bin/env bun
/**
 * Crack the streamed.pk/embedsports.top encoding
 * 
 * Known data from forensic capture:
 * - WHAT header: ISEEYOUSphBxsYsCRXNHyJIpagHRVOXB (32 chars)
 * - Token in URL: jNelkbrVNsCQUTKwSYVmSovfHpRBwsez (32 chars)
 * - Encoded data starts with: e=87}r=HdDG{78sbz"sAZ8<|J<?r'(z}J{Eea_#`e@>_d#u$vF9:Z'bG$:x"(bbwp'I{&y9Hs|dwa<;K$9+%:;A{7B9Jd'ez=
 * - Expected URL: https://lb5.strmd.top/secure/jNelkbrVNsCQUTKwSYVmSovfHpRBwsez/alpha/stream/nba-tv-1/1/playlist.m3u8
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
  
  // Parse protobuf - skip field tag and length
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  return { 
    data: bytes.slice(idx), 
    whatHeader,
    rawBytes: bytes,
  };
}

// Try different decoding algorithms
function tryDecode(encoded: Uint8Array, key: string): string {
  let result = '';
  for (let i = 0; i < encoded.length; i++) {
    result += String.fromCharCode(encoded[i] ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// RC4 implementation
function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  const result = new Uint8Array(data.length);
  let ii = 0;
  j = 0;
  
  for (let k = 0; k < data.length; k++) {
    ii = (ii + 1) % 256;
    j = (j + S[ii]) % 256;
    [S[ii], S[j]] = [S[j], S[ii]];
    const K = S[(S[ii] + S[j]) % 256];
    result[k] = data[k] ^ K;
  }
  
  return result;
}

async function crackEncoding() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  console.log(`Fetching ${source}/${id}/${streamNo}...\n`);
  
  const { data, whatHeader } = await fetchEncoded(source, id, streamNo);
  
  console.log('WHAT header:', whatHeader);
  console.log('WHAT length:', whatHeader.length);
  console.log('Encoded data length:', data.length);
  console.log('Encoded data (first 100):', new TextDecoder().decode(data).substring(0, 100));
  console.log('Encoded bytes (first 20):', Array.from(data.slice(0, 20)));
  
  const expectedUrl = `https://lb5.strmd.top/secure/`;
  const expectedPrefix = 'https://lb';
  
  console.log('\n=== Deriving key from known plaintext ===');
  
  // Derive key from known prefix
  const derivedKey: number[] = [];
  for (let i = 0; i < expectedPrefix.length; i++) {
    derivedKey.push(data[i] ^ expectedPrefix.charCodeAt(i));
  }
  console.log('Derived key bytes:', derivedKey);
  console.log('Derived key chars:', derivedKey.map(b => String.fromCharCode(b)).join(''));
  
  // Check if derived key matches WHAT header
  console.log('\nComparing derived key with WHAT header:');
  for (let i = 0; i < derivedKey.length; i++) {
    const whatByte = whatHeader.charCodeAt(i);
    const diff = derivedKey[i] ^ whatByte;
    console.log(`  [${i}] derived=${derivedKey[i]} (${String.fromCharCode(derivedKey[i])}) | WHAT=${whatByte} (${whatHeader[i]}) | XOR=${diff}`);
  }
  
  // The key might be: WHAT header XOR'd with something
  // Let's find what constant XOR produces the derived key
  console.log('\n=== Finding XOR constant ===');
  
  for (let constant = 0; constant < 256; constant++) {
    let matches = 0;
    for (let i = 0; i < derivedKey.length; i++) {
      if ((whatHeader.charCodeAt(i) ^ constant) === derivedKey[i]) {
        matches++;
      }
    }
    if (matches >= 8) {
      console.log(`Constant ${constant} (0x${constant.toString(16)}, '${String.fromCharCode(constant)}'): ${matches}/${derivedKey.length} matches`);
    }
  }
  
  // Try: key[i] = WHAT[i] XOR position
  console.log('\n=== Trying position-based XOR ===');
  
  for (let offset = 0; offset < 256; offset++) {
    let matches = 0;
    for (let i = 0; i < derivedKey.length; i++) {
      if ((whatHeader.charCodeAt(i) ^ ((i + offset) % 256)) === derivedKey[i]) {
        matches++;
      }
    }
    if (matches >= 8) {
      console.log(`Offset ${offset}: ${matches}/${derivedKey.length} matches`);
    }
  }
  
  // Try: key[i] = WHAT[(i + offset) % 32]
  console.log('\n=== Trying shifted WHAT header ===');
  
  for (let shift = 0; shift < 32; shift++) {
    let matches = 0;
    for (let i = 0; i < derivedKey.length; i++) {
      if (whatHeader.charCodeAt((i + shift) % whatHeader.length) === derivedKey[i]) {
        matches++;
      }
    }
    if (matches >= 5) {
      console.log(`Shift ${shift}: ${matches}/${derivedKey.length} matches`);
      
      // Try decoding with this shift
      let decoded = '';
      for (let i = 0; i < data.length; i++) {
        decoded += String.fromCharCode(data[i] ^ whatHeader.charCodeAt((i + shift) % whatHeader.length));
      }
      console.log(`  Decoded: ${decoded.substring(0, 80)}`);
    }
  }
  
  // Try: key[i] = WHAT[i] XOR WHAT[j] for some j
  console.log('\n=== Trying WHAT[i] XOR WHAT[j] ===');
  
  for (let j = 0; j < whatHeader.length; j++) {
    let matches = 0;
    for (let i = 0; i < derivedKey.length; i++) {
      if ((whatHeader.charCodeAt(i) ^ whatHeader.charCodeAt(j)) === derivedKey[i]) {
        matches++;
      }
    }
    if (matches >= 5) {
      console.log(`j=${j} (${whatHeader[j]}): ${matches}/${derivedKey.length} matches`);
    }
  }
  
  // Try: the key might be a transformation of WHAT header
  // Common transformations: reverse, rotate, etc.
  console.log('\n=== Trying WHAT header transformations ===');
  
  const transformations = [
    { name: 'reverse', key: whatHeader.split('').reverse().join('') },
    { name: 'skip ISEEYO', key: whatHeader.substring(6) },
    { name: 'skip ISEEYOU', key: whatHeader.substring(7) },
    { name: 'lowercase', key: whatHeader.toLowerCase() },
    { name: 'uppercase', key: whatHeader.toUpperCase() },
  ];
  
  for (const { name, key } of transformations) {
    const decoded = tryDecode(data, key);
    console.log(`${name}: ${decoded.substring(0, 60)}`);
    if (decoded.startsWith('https://lb')) {
      console.log(`\n*** SUCCESS with ${name}! ***`);
      console.log(`Full URL: ${decoded}`);
      return decoded;
    }
  }
  
  // Try RC4 with various keys
  console.log('\n=== Trying RC4 ===');
  
  const rc4Keys = [
    whatHeader,
    whatHeader.substring(7),
    whatHeader.split('').reverse().join(''),
  ];
  
  for (const key of rc4Keys) {
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = rc4(keyBytes, data);
    const result = new TextDecoder('utf-8', { fatal: false }).decode(decrypted);
    console.log(`RC4 with "${key.substring(0, 20)}...": ${result.substring(0, 60)}`);
    if (result.startsWith('https://lb')) {
      console.log(`\n*** SUCCESS with RC4! ***`);
      console.log(`Full URL: ${result}`);
      return result;
    }
  }
  
  // The encoding might be more complex
  // Let's analyze the pattern between encoded and expected
  console.log('\n=== Byte-by-byte analysis ===');
  
  const expected = 'https://lb5.strmd.top/secure/';
  console.log('Expected:', expected);
  console.log('Encoded bytes:', Array.from(data.slice(0, expected.length)));
  console.log('Expected bytes:', Array.from(new TextEncoder().encode(expected)));
  
  console.log('\nXOR pattern:');
  for (let i = 0; i < expected.length; i++) {
    const enc = data[i];
    const exp = expected.charCodeAt(i);
    const xor = enc ^ exp;
    const whatByte = whatHeader.charCodeAt(i % whatHeader.length);
    console.log(`  [${i}] enc=${enc} exp=${exp} xor=${xor} (${String.fromCharCode(xor)}) | WHAT[${i % 32}]=${whatByte} (${whatHeader[i % 32]})`);
  }
  
  return null;
}

crackEncoding().catch(console.error);
