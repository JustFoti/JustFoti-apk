#!/usr/bin/env bun
/**
 * Final crack attempt - use real stream data and analyze the encoding
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
  if (!whatHeader) {
    throw new Error('No WHAT header - invalid stream');
  }
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Skip protobuf header
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  const data = bytes.slice(idx);
  return { encoded: new TextDecoder().decode(data), whatHeader, rawBytes: data };
}

async function crackEncoding() {
  // Use a real live stream
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
  console.log(`Fetching ${source}/${id}/${streamNo}...\n`);
  
  const { encoded, whatHeader, rawBytes } = await fetchEncoded(source, id, streamNo);
  
  console.log('WHAT header:', whatHeader);
  console.log('Encoded length:', encoded.length);
  console.log('Encoded:', encoded);
  console.log('\nRaw bytes:', Array.from(rawBytes.slice(0, 50)));
  
  // The expected URL format:
  // https://lb{N}.strmd.top/secure/{32-char-token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  // Total length: ~150 chars for this specific stream
  
  // We know:
  // - Position 0-9: "https://lb" (10 chars)
  // - Position 10: digit 1-5
  // - Position 11-28: ".strmd.top/secure/" (18 chars)
  // - Position 29-60: 32-char token
  // - Position 61: "/"
  // - Position 62-68: "charlie" (7 chars)
  // - etc.
  
  const expectedPlain = `https://lb1.strmd.top/secure/${'X'.repeat(32)}/${source}/stream/${id}/${streamNo}/playlist.m3u8`;
  console.log('\nExpected plaintext length:', expectedPlain.length);
  console.log('Expected format:', expectedPlain);
  
  // The encoding seems to be position-dependent
  // Let's try to find the pattern by analyzing byte relationships
  
  console.log('\n--- Analyzing byte patterns ---');
  
  const whatBytes = new TextEncoder().encode(whatHeader);
  
  // For each position, calculate what transformation would give us the expected char
  const knownPlain = 'https://lb';
  console.log('\nDeriving transformation for known prefix:');
  
  for (let i = 0; i < knownPlain.length; i++) {
    const enc = rawBytes[i];
    const plain = knownPlain.charCodeAt(i);
    const whatByte = whatBytes[i % whatBytes.length];
    
    console.log(`  Pos ${i}: enc=${enc} (${String.fromCharCode(enc)}), plain=${plain} (${knownPlain[i]}), what=${whatByte} (${whatHeader[i % whatHeader.length]})`);
    console.log(`    XOR: ${enc ^ plain}, diff: ${enc - plain}, what-enc: ${whatByte - enc}`);
  }
  
  // Try: The encoding might use a rotating key derived from WHAT header
  // Let's see if there's a pattern in the XOR values
  
  const xorValues: number[] = [];
  for (let i = 0; i < knownPlain.length; i++) {
    xorValues.push(rawBytes[i] ^ knownPlain.charCodeAt(i));
  }
  console.log('\nXOR values for known prefix:', xorValues);
  console.log('As chars:', xorValues.map(v => String.fromCharCode(v)).join(''));
  
  // Check if XOR values match any part of WHAT header
  const xorStr = xorValues.map(v => String.fromCharCode(v)).join('');
  console.log('XOR string in WHAT:', whatHeader.includes(xorStr) ? 'YES' : 'NO');
  
  // Try to find the XOR key by looking at the pattern
  // The key might be: WHAT header repeated, or WHAT header + something
  
  // Let's try decoding with the derived XOR key
  console.log('\n--- Trying to decode with derived key ---');
  
  // Extend the XOR key pattern
  // If the first 10 XOR values form a pattern, extend it
  
  // Try: key = derived XOR values repeated
  const keyFromXor = new Uint8Array(rawBytes.length);
  for (let i = 0; i < rawBytes.length; i++) {
    keyFromXor[i] = xorValues[i % xorValues.length];
  }
  
  const decoded1 = new Uint8Array(rawBytes.length);
  for (let i = 0; i < rawBytes.length; i++) {
    decoded1[i] = rawBytes[i] ^ keyFromXor[i];
  }
  console.log('Decoded with repeated XOR key:', new TextDecoder().decode(decoded1));
  
  // Try: The key might be WHAT header but starting from a specific position
  // Find where the XOR values appear in WHAT header
  
  for (let startPos = 0; startPos < whatHeader.length; startPos++) {
    let matches = true;
    for (let i = 0; i < Math.min(5, xorValues.length); i++) {
      if (whatBytes[(startPos + i) % whatBytes.length] !== xorValues[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      console.log(`\nXOR key matches WHAT header starting at position ${startPos}`);
      
      // Decode with this alignment
      const decoded = new Uint8Array(rawBytes.length);
      for (let i = 0; i < rawBytes.length; i++) {
        decoded[i] = rawBytes[i] ^ whatBytes[(startPos + i) % whatBytes.length];
      }
      const result = new TextDecoder().decode(decoded);
      console.log('Decoded:', result);
      
      if (result.startsWith('https://lb')) {
        console.log('\n*** SUCCESS! ***');
        console.log('Key offset:', startPos);
        return { result, keyOffset: startPos };
      }
    }
  }
  
  // If no match found, the key might be derived differently
  // Try: key = WHAT header with each byte modified
  
  console.log('\n--- Trying modified WHAT keys ---');
  
  for (let mod = -10; mod <= 10; mod++) {
    const modKey = new Uint8Array(whatBytes.length);
    for (let i = 0; i < whatBytes.length; i++) {
      modKey[i] = (whatBytes[i] + mod + 256) % 256;
    }
    
    const decoded = new Uint8Array(rawBytes.length);
    for (let i = 0; i < rawBytes.length; i++) {
      decoded[i] = rawBytes[i] ^ modKey[i % modKey.length];
    }
    const result = new TextDecoder().decode(decoded);
    
    if (result.startsWith('https://lb') || result.includes('strmd.top')) {
      console.log(`Mod ${mod}: ${result.substring(0, 80)}`);
    }
  }
  
  return null;
}

crackEncoding().catch(console.error);
