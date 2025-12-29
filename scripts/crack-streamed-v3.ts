#!/usr/bin/env bun
/**
 * The encoding is position-dependent - likely XOR with the WHAT header
 * but the key might be used in a specific way
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

async function crackXOR() {
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
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

  const whatHeader = response.headers.get('what')!;
  console.log('WHAT header:', whatHeader);
  console.log('WHAT length:', whatHeader.length);
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Skip protobuf header
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  const data = bytes.slice(idx);
  console.log('Data length:', data.length);
  console.log('Data:', new TextDecoder().decode(data));
  
  // We know the plaintext starts with "https://lb"
  const knownPlain = 'https://lb';
  const knownPlainBytes = new TextEncoder().encode(knownPlain);
  
  // Calculate what the XOR key bytes must be for the first 10 chars
  console.log('\n--- Deriving XOR key from known plaintext ---');
  const derivedKey: number[] = [];
  for (let i = 0; i < knownPlainBytes.length; i++) {
    derivedKey.push(data[i] ^ knownPlainBytes[i]);
  }
  console.log('Derived key bytes:', derivedKey);
  console.log('Derived key as string:', String.fromCharCode(...derivedKey));
  
  // Check if derived key matches part of WHAT header
  const whatBytes = new TextEncoder().encode(whatHeader);
  console.log('WHAT bytes:', Array.from(whatBytes.slice(0, 10)));
  
  // The derived key should match WHAT header at some offset
  const derivedKeyStr = String.fromCharCode(...derivedKey);
  const whatIndex = whatHeader.indexOf(derivedKeyStr);
  console.log('Derived key found in WHAT at index:', whatIndex);
  
  if (whatIndex === -1) {
    // Try to find partial match
    for (let len = derivedKey.length; len >= 3; len--) {
      const partial = String.fromCharCode(...derivedKey.slice(0, len));
      const partialIdx = whatHeader.indexOf(partial);
      if (partialIdx !== -1) {
        console.log(`Partial match (${len} chars) at index ${partialIdx}: "${partial}"`);
        break;
      }
    }
  }
  
  // Try XOR with different key offsets
  console.log('\n--- Trying XOR with different key offsets ---');
  
  for (let keyOffset = 0; keyOffset < whatHeader.length; keyOffset++) {
    const decoded = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      decoded[i] = data[i] ^ whatBytes[(keyOffset + i) % whatBytes.length];
    }
    const result = new TextDecoder('utf-8', { fatal: false }).decode(decoded);
    
    if (result.startsWith('https://lb') || result.includes('strmd.top')) {
      console.log(`\nKey offset ${keyOffset}:`);
      console.log(result);
      
      const urlMatch = result.match(/https:\/\/lb\d\.strmd\.top\/secure\/[a-zA-Z0-9]+\/[^/]+\/stream\/[^/]+\/\d+\/playlist\.m3u8/);
      if (urlMatch) {
        console.log('\n*** FOUND URL:', urlMatch[0]);
        return urlMatch[0];
      }
    }
  }
  
  // Maybe the key is derived differently
  // Try: key = WHAT header repeated, but starting from a calculated position
  console.log('\n--- Trying calculated key offset ---');
  
  // The first byte of data XOR first byte of "https" should give us the key byte
  const firstKeyByte = data[0] ^ 'h'.charCodeAt(0);
  console.log('First key byte should be:', firstKeyByte, '=', String.fromCharCode(firstKeyByte));
  
  // Find this byte in WHAT header
  for (let i = 0; i < whatBytes.length; i++) {
    if (whatBytes[i] === firstKeyByte) {
      console.log(`Found at WHAT index ${i}`);
      
      // Try decoding with this offset
      const decoded = new Uint8Array(data.length);
      for (let j = 0; j < data.length; j++) {
        decoded[j] = data[j] ^ whatBytes[(i + j) % whatBytes.length];
      }
      const result = new TextDecoder('utf-8', { fatal: false }).decode(decoded);
      console.log('Result:', result.substring(0, 100));
      
      if (result.startsWith('https://lb')) {
        console.log('\n*** FULL DECODED:', result);
        return result;
      }
    }
  }
  
  return null;
}

crackXOR().catch(console.error);
