#!/usr/bin/env bun
/**
 * Build a decoding table by making multiple requests and comparing
 * the encoded responses with known plaintext patterns
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

  const whatHeader = response.headers.get('what')!;
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Skip protobuf header
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  const data = bytes.slice(idx);
  return { encoded: new TextDecoder().decode(data), whatHeader };
}

async function buildDecodingTable() {
  // The URL format is:
  // https://lb{N}.strmd.top/secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  
  // Make requests with different sources to find patterns
  const testCases = [
    { source: 'charlie', id: 'test-123', streamNo: '1' },
    { source: 'alpha', id: 'test-123', streamNo: '1' },
    { source: 'echo', id: 'test-123', streamNo: '1' },
  ];
  
  console.log('Fetching test cases...\n');
  
  const results: { source: string; id: string; streamNo: string; encoded: string; whatHeader: string }[] = [];
  
  for (const tc of testCases) {
    try {
      const { encoded, whatHeader } = await fetchEncoded(tc.source, tc.id, tc.streamNo);
      results.push({ ...tc, encoded, whatHeader });
      console.log(`${tc.source}/${tc.id}/${tc.streamNo}:`);
      console.log(`  WHAT: ${whatHeader}`);
      console.log(`  Encoded: ${encoded.substring(0, 80)}...`);
      console.log(`  Length: ${encoded.length}`);
    } catch (e: any) {
      console.log(`${tc.source}/${tc.id}/${tc.streamNo}: Error - ${e.message}`);
    }
  }
  
  if (results.length < 2) {
    console.log('\nNot enough successful requests');
    return;
  }
  
  // Compare the encoded strings to find the source position
  // The source appears in the URL: /secure/{token}/{source}/stream/
  // So after the token (32 chars) and some fixed text, we should see the source
  
  console.log('\n--- Comparing encoded strings ---');
  
  // The prefix "https://lb{N}.strmd.top/secure/" is 30 chars
  // Then 32 char token
  // Then "/{source}/stream/{id}/{streamNo}/playlist.m3u8"
  
  // Position 62 should be the start of "/{source}/"
  // So position 63 should be the first char of source
  
  const sourceStartPos = 30 + 32 + 1; // 63
  
  for (const r of results) {
    console.log(`\n${r.source}:`);
    console.log(`  Char at pos ${sourceStartPos}: '${r.encoded[sourceStartPos]}'`);
    console.log(`  Expected first char: '${r.source[0]}'`);
    
    // Find where the source might be in the encoded string
    // by looking for a sequence that differs between results
    for (let pos = 50; pos < 80; pos++) {
      const chars = results.map(r => r.encoded[pos]);
      const unique = new Set(chars).size;
      if (unique > 1) {
        console.log(`  Position ${pos} varies: ${chars.join(', ')}`);
      }
    }
  }
  
  // Try to decode using the WHAT header as a key with different methods
  console.log('\n--- Trying decoding methods ---');
  
  const r = results[0];
  const whatBytes = new TextEncoder().encode(r.whatHeader);
  const encodedBytes = new TextEncoder().encode(r.encoded);
  
  // Method: XOR each byte with corresponding WHAT byte, but WHAT might be used as a lookup table
  // The WHAT header has 32 unique chars - could be a substitution alphabet
  
  // Create a mapping from WHAT header chars to positions
  const whatCharToPos: Record<string, number> = {};
  for (let i = 0; i < r.whatHeader.length; i++) {
    whatCharToPos[r.whatHeader[i]] = i;
  }
  
  console.log('WHAT char positions:', whatCharToPos);
  
  // Try: each encoded char's position in WHAT header gives the plaintext char code
  let decoded1 = '';
  for (const c of r.encoded) {
    const pos = whatCharToPos[c];
    if (pos !== undefined) {
      // Map position to ASCII: 0-9 -> '0'-'9', 10-35 -> 'a'-'z', etc.
      if (pos < 10) decoded1 += String.fromCharCode(48 + pos); // 0-9
      else if (pos < 36) decoded1 += String.fromCharCode(97 + pos - 10); // a-z
      else decoded1 += String.fromCharCode(65 + pos - 36); // A-Z
    } else {
      decoded1 += c; // Keep as-is if not in WHAT
    }
  }
  console.log('\nMethod 1 (position mapping):', decoded1.substring(0, 100));
  
  // Try: XOR with position in WHAT
  let decoded2 = '';
  for (let i = 0; i < r.encoded.length; i++) {
    const c = r.encoded.charCodeAt(i);
    const k = whatBytes[i % whatBytes.length];
    decoded2 += String.fromCharCode(c ^ k);
  }
  console.log('Method 2 (XOR):', decoded2.substring(0, 100));
  
  // Try: Subtract WHAT char code from encoded char code
  let decoded3 = '';
  for (let i = 0; i < r.encoded.length; i++) {
    const c = r.encoded.charCodeAt(i);
    const k = whatBytes[i % whatBytes.length];
    const d = ((c - k) % 256 + 256) % 256;
    decoded3 += String.fromCharCode(d);
  }
  console.log('Method 3 (subtract):', decoded3.substring(0, 100));
  
  // Try: Add WHAT char code to encoded char code
  let decoded4 = '';
  for (let i = 0; i < r.encoded.length; i++) {
    const c = r.encoded.charCodeAt(i);
    const k = whatBytes[i % whatBytes.length];
    const d = (c + k) % 256;
    decoded4 += String.fromCharCode(d);
  }
  console.log('Method 4 (add):', decoded4.substring(0, 100));
}

buildDecodingTable().catch(console.error);
