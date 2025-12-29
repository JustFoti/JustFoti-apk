#!/usr/bin/env bun
/**
 * The response is printable ASCII - it's a substitution cipher!
 * 
 * We know the URL format:
 * https://lb{N}.strmd.top/secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
 * 
 * Let's find the character mapping
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

async function analyzeSubstitution() {
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
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Skip protobuf header
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  const data = bytes.slice(idx);
  const encoded = new TextDecoder().decode(data);
  
  console.log('Encoded:', encoded);
  console.log('Length:', encoded.length);
  
  // The expected plaintext URL:
  // https://lb{N}.strmd.top/secure/{32-char-token}/charlie/stream/wellington-firebirds-vs-auckland-aces-1629472738/1/playlist.m3u8
  
  // We know certain parts of the plaintext:
  // - Starts with "https://lb"
  // - Contains ".strmd.top/secure/"
  // - Contains "/charlie/stream/"
  // - Ends with "/1/playlist.m3u8"
  
  const knownParts = [
    { plain: 'https://lb', position: 0 },
    { plain: '.strmd.top/secure/', position: -1 }, // unknown position
    { plain: '/charlie/stream/', position: -1 },
    { plain: '/1/playlist.m3u8', position: -1 }, // at end
  ];
  
  // Build character mapping from known positions
  const charMap: Record<string, string> = {};
  
  // "https://lb" at position 0
  const prefix = 'https://lb';
  for (let i = 0; i < prefix.length; i++) {
    charMap[encoded[i]] = prefix[i];
  }
  
  console.log('\nInitial char map from "https://lb":');
  console.log(charMap);
  
  // Apply what we know to decode
  let decoded = '';
  for (const c of encoded) {
    decoded += charMap[c] || c;
  }
  console.log('\nPartially decoded:', decoded);
  
  // The suffix "/1/playlist.m3u8" should be at the end
  const suffix = '/1/playlist.m3u8';
  const suffixStart = encoded.length - suffix.length;
  
  console.log('\nLast', suffix.length, 'chars of encoded:', encoded.slice(suffixStart));
  console.log('Expected suffix:', suffix);
  
  // Add suffix mapping
  for (let i = 0; i < suffix.length; i++) {
    const encChar = encoded[suffixStart + i];
    const plainChar = suffix[i];
    if (charMap[encChar] && charMap[encChar] !== plainChar) {
      console.log(`Conflict: ${encChar} maps to both ${charMap[encChar]} and ${plainChar}`);
    }
    charMap[encChar] = plainChar;
  }
  
  // Re-decode with updated map
  decoded = '';
  for (const c of encoded) {
    decoded += charMap[c] || `[${c}]`;
  }
  console.log('\nWith suffix mapping:', decoded);
  
  // Now let's find ".strmd.top/secure/"
  // After "https://lb" we have a digit (1-5), then ".strmd.top/secure/"
  // Position 10 should be the lb number
  const lbDigit = encoded[10];
  console.log('\nLB digit encoded as:', lbDigit);
  
  // Try each lb number
  for (let lb = 1; lb <= 5; lb++) {
    const testMap = { ...charMap };
    testMap[lbDigit] = String(lb);
    
    // ".strmd.top/secure/" starts at position 11
    const strmdPart = '.strmd.top/secure/';
    for (let i = 0; i < strmdPart.length; i++) {
      testMap[encoded[11 + i]] = strmdPart[i];
    }
    
    // Decode with this mapping
    let testDecoded = '';
    for (const c of encoded) {
      testDecoded += testMap[c] || `[${c}]`;
    }
    
    console.log(`\nWith lb${lb}:`, testDecoded);
    
    // Check if it looks like a valid URL
    if (testDecoded.includes('[') === false || testDecoded.split('[').length < 5) {
      // Try to extract and verify the URL
      const urlMatch = testDecoded.match(/https:\/\/lb\d\.strmd\.top\/secure\/[a-zA-Z0-9]+\/charlie\/stream\/[^/]+\/\d+\/playlist\.m3u8/);
      if (urlMatch) {
        console.log('\n*** POTENTIAL URL:', urlMatch[0]);
        
        // Verify
        try {
          const testRes = await fetch(urlMatch[0], {
            method: 'HEAD',
            headers: { 'Referer': `${EMBED_BASE}/` },
          });
          console.log('Status:', testRes.status);
          if (testRes.ok) {
            console.log('\n*** WORKING URL FOUND! ***');
            return urlMatch[0];
          }
        } catch {}
      }
    }
  }
  
  // Print the full character mapping we've built
  console.log('\n--- Full character mapping ---');
  const sortedMap = Object.entries(charMap).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [enc, plain] of sortedMap) {
    console.log(`  '${enc}' -> '${plain}'`);
  }
  
  return null;
}

analyzeSubstitution().catch(console.error);
