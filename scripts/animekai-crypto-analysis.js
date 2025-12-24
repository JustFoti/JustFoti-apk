/**
 * AnimeKai Encryption Analysis
 * 
 * Observations from enc-dec.app/api/enc-kai:
 * 
 * test123 -> xQm9tJfLwGhz_0Eq8S_YAHYkwp-q6vLfm50W5eFnyd12nDopajWPyD4
 * hello   -> xQm9tJfLwGhz_0Eq8S_YAHYkwp-qUvLfm50W5eFnyd06nNopBQ
 * 12345   -> xQm9tJfLwGhz_0Eq8S_YAHYkwp-qbfLfm50W5QJnyd1mnDspaA
 * 
 * Common prefix: xQm9tJfLwGhz_0Eq8S_YAHYkwp-q (27 chars)
 * 
 * This suggests:
 * 1. URL-safe Base64 encoding
 * 2. Fixed header/IV
 * 3. The plaintext affects only the latter part
 */

// URL-safe Base64 decode
function urlSafeBase64Decode(str) {
  // Replace URL-safe chars with standard Base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

// URL-safe Base64 encode
function urlSafeBase64Encode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Test data
const samples = [
  { plain: 'test123', cipher: 'xQm9tJfLwGhz_0Eq8S_YAHYkwp-q6vLfm50W5eFnyd12nDopajWPyD4' },
  { plain: 'hello', cipher: 'xQm9tJfLwGhz_0Eq8S_YAHYkwp-qUvLfm50W5eFnyd06nNopBQ' },
  { plain: '12345', cipher: 'xQm9tJfLwGhz_0Eq8S_YAHYkwp-qbfLfm50W5QJnyd1mnDspaA' },
];

console.log('=== AnimeKai Encryption Analysis ===\n');

// Decode all ciphertexts
for (const sample of samples) {
  const decoded = urlSafeBase64Decode(sample.cipher);
  console.log(`Plain: "${sample.plain}" (${sample.plain.length} chars)`);
  console.log(`Cipher: ${sample.cipher} (${sample.cipher.length} chars)`);
  console.log(`Decoded: ${decoded.toString('hex')} (${decoded.length} bytes)`);
  console.log(`Decoded (ascii): ${decoded.toString('ascii').replace(/[^\x20-\x7e]/g, '.')}`);
  console.log();
}

// Find common prefix in decoded bytes
const decoded1 = urlSafeBase64Decode(samples[0].cipher);
const decoded2 = urlSafeBase64Decode(samples[1].cipher);
const decoded3 = urlSafeBase64Decode(samples[2].cipher);

let commonPrefixLen = 0;
for (let i = 0; i < Math.min(decoded1.length, decoded2.length, decoded3.length); i++) {
  if (decoded1[i] === decoded2[i] && decoded2[i] === decoded3[i]) {
    commonPrefixLen++;
  } else {
    break;
  }
}

console.log(`Common prefix length: ${commonPrefixLen} bytes`);
console.log(`Common prefix (hex): ${decoded1.slice(0, commonPrefixLen).toString('hex')}`);
console.log();

// XOR analysis - try to find the key
console.log('=== XOR Analysis ===\n');

for (const sample of samples) {
  const decoded = urlSafeBase64Decode(sample.cipher);
  const plainBytes = Buffer.from(sample.plain, 'utf8');
  
  console.log(`Plain: "${sample.plain}"`);
  console.log(`Plain bytes: ${plainBytes.toString('hex')}`);
  
  // Try XOR at different offsets
  for (let offset = 0; offset < decoded.length - plainBytes.length; offset++) {
    const xorResult = Buffer.alloc(plainBytes.length);
    for (let i = 0; i < plainBytes.length; i++) {
      xorResult[i] = decoded[offset + i] ^ plainBytes[i];
    }
    
    // Check if XOR result looks like a key (repeating pattern or printable)
    const isPrintable = xorResult.every(b => b >= 0x20 && b <= 0x7e);
    if (isPrintable || offset < 5 || offset > decoded.length - plainBytes.length - 5) {
      console.log(`  Offset ${offset}: XOR key = ${xorResult.toString('hex')} (${isPrintable ? 'printable' : 'binary'})`);
    }
  }
  console.log();
}

// Compare differences between ciphertexts
console.log('=== Difference Analysis ===\n');

for (let i = 0; i < decoded1.length; i++) {
  const b1 = decoded1[i];
  const b2 = decoded2[i];
  const b3 = decoded3[i];
  
  if (b1 !== b2 || b2 !== b3) {
    console.log(`Byte ${i}: ${b1.toString(16).padStart(2, '0')} vs ${b2.toString(16).padStart(2, '0')} vs ${b3.toString(16).padStart(2, '0')}`);
  }
}
