#!/usr/bin/env bun
/**
 * Different approach: The response might contain the URL in a scrambled form
 * where each character is mapped through a lookup table derived from WHAT header
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

// Standard base64 alphabet
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// URL-safe characters
const URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~:/?#[]@!$&\'()*+,;=';

async function analyzeEncoding() {
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
  const { data, whatHeader } = await fetchEncoded(source, id, streamNo);
  const encoded = new TextDecoder().decode(data);
  
  console.log('WHAT:', whatHeader);
  console.log('Encoded:', encoded);
  console.log('Length:', encoded.length);
  
  // Analyze character frequency in encoded data
  const freq: Record<string, number> = {};
  for (const c of encoded) {
    freq[c] = (freq[c] || 0) + 1;
  }
  
  console.log('\n--- Character frequency in encoded data ---');
  const sortedFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  console.log('Top 20:', sortedFreq.slice(0, 20).map(([c, n]) => `'${c}':${n}`).join(', '));
  console.log('Unique chars:', Object.keys(freq).length);
  
  // In a URL, the most common chars are: /, -, a-z, 0-9
  // Let's see if we can map based on frequency
  
  // Expected URL structure
  const expectedUrl = `https://lb1.strmd.top/secure/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/${source}/stream/${id}/${streamNo}/playlist.m3u8`;
  
  // Count frequency in expected URL
  const expectedFreq: Record<string, number> = {};
  for (const c of expectedUrl) {
    expectedFreq[c] = (expectedFreq[c] || 0) + 1;
  }
  
  console.log('\n--- Character frequency in expected URL ---');
  const sortedExpected = Object.entries(expectedFreq).sort((a, b) => b[1] - a[1]);
  console.log('Top 20:', sortedExpected.slice(0, 20).map(([c, n]) => `'${c}':${n}`).join(', '));
  
  // The most frequent char in URL is likely '/' or '-' or 'e' or 'a'
  // Let's try to build a mapping
  
  console.log('\n--- Attempting frequency-based mapping ---');
  
  // Sort both by frequency
  const encChars = sortedFreq.map(([c]) => c);
  const expChars = sortedExpected.map(([c]) => c);
  
  // Build a mapping
  const mapping: Record<string, string> = {};
  for (let i = 0; i < Math.min(encChars.length, expChars.length); i++) {
    mapping[encChars[i]] = expChars[i];
  }
  
  // Apply mapping
  let decoded = '';
  for (const c of encoded) {
    decoded += mapping[c] || c;
  }
  console.log('Frequency-mapped:', decoded.substring(0, 100));
  
  // This probably won't work perfectly, but let's see if it gives us hints
  
  // Alternative: The encoding might use a custom alphabet
  // WHAT header has 32 chars - could be a custom base32-like encoding
  
  console.log('\n--- Checking if WHAT is a custom alphabet ---');
  console.log('WHAT unique chars:', new Set(whatHeader).size);
  
  // Check if all encoded chars are in WHAT header
  const whatSet = new Set(whatHeader);
  const encodedInWhat = [...encoded].filter(c => whatSet.has(c)).length;
  console.log('Encoded chars in WHAT:', encodedInWhat, '/', encoded.length);
  
  // Check if all encoded chars are printable ASCII
  const printable = [...encoded].filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).length;
  console.log('Printable chars:', printable, '/', encoded.length);
  
  // The encoding might be: each pair of chars encodes one byte
  // Or: it's a simple substitution with a key derived from WHAT
  
  // Let's try: create a substitution table from WHAT header
  // WHAT header chars map to 0-31, then use that as index into URL_CHARS
  
  console.log('\n--- Trying WHAT-based substitution ---');
  
  const whatToIndex: Record<string, number> = {};
  for (let i = 0; i < whatHeader.length; i++) {
    whatToIndex[whatHeader[i]] = i;
  }
  
  // Try: encoded char -> index in WHAT -> some transformation -> plaintext char
  
  // First, let's see what indices we get
  const indices: number[] = [];
  for (const c of encoded.substring(0, 20)) {
    const idx = whatToIndex[c];
    indices.push(idx !== undefined ? idx : -1);
  }
  console.log('First 20 char indices in WHAT:', indices);
  
  // The expected first chars are: h, t, t, p, s, :, /, /, l, b
  // ASCII: 104, 116, 116, 112, 115, 58, 47, 47, 108, 98
  
  // If index maps to ASCII somehow...
  // index + offset = ASCII?
  
  const expectedAscii = [104, 116, 116, 112, 115, 58, 47, 47, 108, 98];
  console.log('Expected ASCII:', expectedAscii);
  
  // Calculate what offset would be needed
  const offsets: number[] = [];
  for (let i = 0; i < Math.min(indices.length, expectedAscii.length); i++) {
    if (indices[i] !== -1) {
      offsets.push(expectedAscii[i] - indices[i]);
    }
  }
  console.log('Required offsets:', offsets);
  
  // If offsets are consistent, we found the pattern!
  const uniqueOffsets = new Set(offsets);
  console.log('Unique offsets:', [...uniqueOffsets]);
  
  return null;
}

analyzeEncoding().catch(console.error);
