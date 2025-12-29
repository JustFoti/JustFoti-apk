#!/usr/bin/env bun
/**
 * Let's try combining the WHAT header with the request parameters
 * The key might be derived from: WHAT + source + id + streamNo
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

async function fetchAndAnalyze(source: string, id: string, streamNo: string) {
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
  
  // Skip protobuf header
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  const encodedData = new TextDecoder().decode(bytes.slice(idx));
  
  return { whatHeader, encodedData, source, id, streamNo };
}

async function crackEncoding() {
  const source = 'golf';
  const id = '18634';
  const streamNo = '1';
  
  console.log(`Fetching ${source}/${id}/${streamNo}...\n`);
  
  const { whatHeader, encodedData } = await fetchAndAnalyze(source, id, streamNo);
  
  console.log('WHAT header:', whatHeader);
  console.log('Encoded data length:', encodedData.length);
  console.log('Encoded data:', encodedData);
  
  // The expected URL format:
  // https://lb{N}.strmd.top/secure/{32-char-token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  // For golf/18634/1:
  // https://lb?.strmd.top/secure/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/golf/stream/18634/1/playlist.m3u8
  
  const expectedPrefix = 'https://lb';
  const expectedSuffix = `/golf/stream/${id}/${streamNo}/playlist.m3u8`;
  
  console.log('\nExpected prefix:', expectedPrefix);
  console.log('Expected suffix:', expectedSuffix);
  
  // Derive the XOR key from the known prefix
  const derivedKey: number[] = [];
  for (let i = 0; i < expectedPrefix.length; i++) {
    derivedKey.push(encodedData.charCodeAt(i) ^ expectedPrefix.charCodeAt(i));
  }
  
  console.log('\nDerived key from prefix:', derivedKey.map(b => String.fromCharCode(b)).join(''));
  console.log('Derived key bytes:', derivedKey);
  
  // Check if the derived key matches any part of WHAT header
  const whatBytes = whatHeader.split('').map(c => c.charCodeAt(0));
  console.log('\nWHAT bytes:', whatBytes);
  
  // Try to find a pattern
  console.log('\n=== Analyzing key pattern ===');
  
  for (let i = 0; i < derivedKey.length; i++) {
    const dk = derivedKey[i];
    const whatByte = whatBytes[i];
    const whatByte7 = whatBytes[i + 7];
    
    console.log(`Pos ${i}: derived=${dk} (${String.fromCharCode(dk)})`);
    console.log(`  WHAT[${i}]=${whatByte} (${whatHeader[i]}), XOR=${dk ^ whatByte}`);
    if (i + 7 < whatHeader.length) {
      console.log(`  WHAT[${i+7}]=${whatByte7} (${whatHeader[i+7]}), XOR=${dk ^ whatByte7}`);
    }
    
    // Check if derived key byte appears anywhere in WHAT
    const foundAt = whatBytes.indexOf(dk);
    if (foundAt !== -1) {
      console.log(`  Found at WHAT[${foundAt}]`);
    }
  }
  
  // Try: key[i] = WHAT[i] XOR constant
  console.log('\n=== Trying WHAT XOR constant ===');
  
  for (let constant = 0; constant < 256; constant++) {
    let matches = 0;
    for (let i = 0; i < derivedKey.length; i++) {
      if ((whatBytes[i] ^ constant) === derivedKey[i]) {
        matches++;
      }
    }
    if (matches >= 5) {
      console.log(`Constant ${constant} (0x${constant.toString(16)}): ${matches} matches`);
    }
  }
  
  // Try: key[i] = WHAT[i] XOR WHAT[j] for some fixed j
  console.log('\n=== Trying WHAT[i] XOR WHAT[j] ===');
  
  for (let j = 0; j < whatHeader.length; j++) {
    let matches = 0;
    for (let i = 0; i < derivedKey.length; i++) {
      if ((whatBytes[i] ^ whatBytes[j]) === derivedKey[i]) {
        matches++;
      }
    }
    if (matches >= 3) {
      console.log(`j=${j}: ${matches} matches`);
    }
  }
  
  // Try: key[i] = WHAT[(i + offset) % 32] XOR something
  console.log('\n=== Trying offset + XOR ===');
  
  for (let offset = 0; offset < 32; offset++) {
    for (let xorVal = 0; xorVal < 256; xorVal++) {
      let matches = 0;
      for (let i = 0; i < derivedKey.length; i++) {
        if ((whatBytes[(i + offset) % whatHeader.length] ^ xorVal) === derivedKey[i]) {
          matches++;
        }
      }
      if (matches === derivedKey.length) {
        console.log(`Offset ${offset}, XOR ${xorVal}: PERFECT MATCH!`);
        
        // Decode the full data
        let decoded = '';
        for (let i = 0; i < encodedData.length; i++) {
          decoded += String.fromCharCode(encodedData.charCodeAt(i) ^ (whatBytes[(i + offset) % whatHeader.length] ^ xorVal));
        }
        console.log('Decoded:', decoded);
        return decoded;
      }
    }
  }
  
  // Try: the key might be position-dependent in a more complex way
  console.log('\n=== Trying position-dependent formulas ===');
  
  // Formula: key[i] = WHAT[f(i)] where f is some function
  const formulas = [
    (i: number) => (i * 2) % whatHeader.length,
    (i: number) => (i * 3) % whatHeader.length,
    (i: number) => (i * 5) % whatHeader.length,
    (i: number) => (i * 7) % whatHeader.length,
    (i: number) => (i * 11) % whatHeader.length,
    (i: number) => (i * 13) % whatHeader.length,
    (i: number) => (whatHeader.length - 1 - i) % whatHeader.length,
    (i: number) => (i + i * i) % whatHeader.length,
  ];
  
  for (let fi = 0; fi < formulas.length; fi++) {
    const f = formulas[fi];
    for (let xorVal = 0; xorVal < 256; xorVal++) {
      let matches = 0;
      for (let i = 0; i < derivedKey.length; i++) {
        if ((whatBytes[f(i)] ^ xorVal) === derivedKey[i]) {
          matches++;
        }
      }
      if (matches === derivedKey.length) {
        console.log(`Formula ${fi}, XOR ${xorVal}: PERFECT MATCH!`);
        
        let decoded = '';
        for (let i = 0; i < encodedData.length; i++) {
          decoded += String.fromCharCode(encodedData.charCodeAt(i) ^ (whatBytes[f(i)] ^ xorVal));
        }
        console.log('Decoded:', decoded);
        return decoded;
      }
    }
  }
  
  // The key might involve the source/id/streamNo
  console.log('\n=== Trying with request parameters ===');
  
  const combinedKey = whatHeader + source + id + streamNo;
  let decoded1 = '';
  for (let i = 0; i < encodedData.length; i++) {
    decoded1 += String.fromCharCode(encodedData.charCodeAt(i) ^ combinedKey.charCodeAt(i % combinedKey.length));
  }
  console.log('WHAT+source+id+streamNo:', decoded1.substring(0, 80));
  
  // Try: key = hash of WHAT header
  function simpleHash(str: string): Uint8Array {
    const result = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      let h = str.charCodeAt(i);
      for (let j = 0; j < str.length; j++) {
        h = (h * 31 + str.charCodeAt(j)) & 0xff;
      }
      result[i] = h;
    }
    return result;
  }
  
  const hashedKey = simpleHash(whatHeader);
  let decoded2 = '';
  for (let i = 0; i < encodedData.length; i++) {
    decoded2 += String.fromCharCode(encodedData.charCodeAt(i) ^ hashedKey[i % hashedKey.length]);
  }
  console.log('Hashed WHAT key:', decoded2.substring(0, 80));
  
  return null;
}

crackEncoding().catch(console.error);
