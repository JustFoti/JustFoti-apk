#!/usr/bin/env bun
/**
 * The first byte is unchanged (XOR 0). Let's see if there's a pattern
 * where some bytes are unchanged and others are transformed.
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

async function analyzeEncoding() {
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
  const { data, whatHeader } = await fetchEncoded(source, id, streamNo);
  
  console.log('WHAT:', whatHeader);
  console.log('Data:', new TextDecoder().decode(data));
  console.log('Length:', data.length);
  
  // The expected URL
  // We don't know the exact token, but we know the structure
  // https://lb{N}.strmd.top/secure/{token}/charlie/stream/{id}/1/playlist.m3u8
  
  // Let's build the expected plaintext with placeholders for unknown parts
  const prefix = 'https://lb';  // 10 chars
  const afterLb = '.strmd.top/secure/';  // 18 chars, starts at pos 11
  const afterToken = `/charlie/stream/${id}/${streamNo}/playlist.m3u8`;  // known suffix
  
  // Total known structure:
  // [0-9]: https://lb
  // [10]: digit 1-5
  // [11-28]: .strmd.top/secure/
  // [29-60]: 32-char token (unknown)
  // [61-end]: /charlie/stream/.../playlist.m3u8
  
  const suffixStart = 29 + 32; // Position 61
  const expectedSuffix = afterToken;
  
  console.log('\n--- Checking suffix alignment ---');
  console.log('Expected suffix start:', suffixStart);
  console.log('Expected suffix:', expectedSuffix);
  console.log('Expected suffix length:', expectedSuffix.length);
  console.log('Data length:', data.length);
  console.log('Calculated total:', suffixStart + expectedSuffix.length);
  
  // The data is 188 bytes, expected is ~141 chars
  // There might be padding or the URL is longer
  
  // Let's try a different approach: find the suffix in the encoded data
  // The suffix ends with "playlist.m3u8" - let's find where this might be
  
  const suffixEnd = 'playlist.m3u8';
  console.log('\n--- Looking for suffix pattern ---');
  
  // If we know the last 13 chars should be "playlist.m3u8"
  // Let's see what transformation would produce that
  
  const dataEnd = data.slice(-suffixEnd.length);
  console.log('Last', suffixEnd.length, 'bytes:', new TextDecoder().decode(dataEnd));
  
  // Calculate XOR key for suffix
  const suffixXor: number[] = [];
  for (let i = 0; i < suffixEnd.length; i++) {
    suffixXor.push(dataEnd[i] ^ suffixEnd.charCodeAt(i));
  }
  console.log('Suffix XOR values:', suffixXor);
  console.log('Suffix XOR as string:', suffixXor.map(v => String.fromCharCode(v)).join(''));
  
  // Check if suffix XOR matches part of WHAT header
  const whatBytes = new TextEncoder().encode(whatHeader);
  const suffixXorStr = suffixXor.map(v => String.fromCharCode(v)).join('');
  
  // Find where in WHAT header this pattern might start
  for (let offset = 0; offset < whatHeader.length; offset++) {
    let matches = true;
    for (let i = 0; i < suffixXor.length && matches; i++) {
      if (whatBytes[(offset + i) % whatBytes.length] !== suffixXor[i]) {
        matches = false;
      }
    }
    if (matches) {
      console.log(`Suffix XOR matches WHAT at offset ${offset}`);
    }
  }
  
  // The key insight: the XOR key position depends on the data position
  // Key position = (data position + some offset) % 32
  
  // Let's find the offset by using the known prefix
  console.log('\n--- Finding key offset from prefix ---');
  
  const knownPrefix = 'https://lb';
  for (let keyOffset = 0; keyOffset < 32; keyOffset++) {
    let decoded = '';
    for (let i = 0; i < knownPrefix.length; i++) {
      const keyByte = whatBytes[(keyOffset + i) % whatBytes.length];
      decoded += String.fromCharCode(data[i] ^ keyByte);
    }
    if (decoded === knownPrefix) {
      console.log(`Key offset ${keyOffset} produces correct prefix!`);
      
      // Decode the full data with this offset
      let fullDecoded = '';
      for (let i = 0; i < data.length; i++) {
        const keyByte = whatBytes[(keyOffset + i) % whatBytes.length];
        fullDecoded += String.fromCharCode(data[i] ^ keyByte);
      }
      console.log('Full decoded:', fullDecoded);
      return fullDecoded;
    }
  }
  
  // If simple XOR doesn't work, try other transformations
  console.log('\n--- Trying other transformations ---');
  
  // Maybe it's: plaintext[i] = data[i] XOR WHAT[(i * something) % 32]
  for (let mult = 1; mult <= 10; mult++) {
    let decoded = '';
    for (let i = 0; i < knownPrefix.length; i++) {
      const keyByte = whatBytes[(i * mult) % whatBytes.length];
      decoded += String.fromCharCode(data[i] ^ keyByte);
    }
    if (decoded === knownPrefix) {
      console.log(`Multiplier ${mult} works!`);
    }
  }
  
  // Maybe the key is used in reverse
  console.log('\n--- Trying reversed key ---');
  const reversedWhat = whatHeader.split('').reverse().join('');
  const reversedBytes = new TextEncoder().encode(reversedWhat);
  
  for (let keyOffset = 0; keyOffset < 32; keyOffset++) {
    let decoded = '';
    for (let i = 0; i < knownPrefix.length; i++) {
      const keyByte = reversedBytes[(keyOffset + i) % reversedBytes.length];
      decoded += String.fromCharCode(data[i] ^ keyByte);
    }
    if (decoded === knownPrefix) {
      console.log(`Reversed key offset ${keyOffset} works!`);
    }
  }
  
  // Maybe it's not XOR at all - try subtraction
  console.log('\n--- Trying subtraction ---');
  for (let keyOffset = 0; keyOffset < 32; keyOffset++) {
    let decoded = '';
    let valid = true;
    for (let i = 0; i < knownPrefix.length && valid; i++) {
      const keyByte = whatBytes[(keyOffset + i) % whatBytes.length];
      const d = (data[i] - keyByte + 256) % 256;
      if (d < 32 || d > 126) valid = false;
      decoded += String.fromCharCode(d);
    }
    if (valid && decoded === knownPrefix) {
      console.log(`Subtraction with offset ${keyOffset} works!`);
    }
  }
  
  // Try addition
  console.log('\n--- Trying addition ---');
  for (let keyOffset = 0; keyOffset < 32; keyOffset++) {
    let decoded = '';
    let valid = true;
    for (let i = 0; i < knownPrefix.length && valid; i++) {
      const keyByte = whatBytes[(keyOffset + i) % whatBytes.length];
      const d = (data[i] + keyByte) % 256;
      if (d < 32 || d > 126) valid = false;
      decoded += String.fromCharCode(d);
    }
    if (valid && decoded === knownPrefix) {
      console.log(`Addition with offset ${keyOffset} works!`);
    }
  }
  
  return null;
}

analyzeEncoding().catch(console.error);
