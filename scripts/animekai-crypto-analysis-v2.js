/**
 * AnimeKai Encryption Analysis v2
 * 
 * Key findings:
 * - Common prefix: 21 bytes (c509bdb497cbc06873ff412af12fd8007624c29faa)
 * - Plaintext affects bytes starting at position 21
 * - Output is URL-safe Base64 encoded
 */

// URL-safe Base64 decode
function urlSafeBase64Decode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
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

console.log('=== AnimeKai Encryption Analysis v2 ===\n');

// The common prefix is 21 bytes
const HEADER_LEN = 21;

// Analyze the variable part (after header)
console.log('=== Variable Part Analysis ===\n');

for (const sample of samples) {
  const decoded = urlSafeBase64Decode(sample.cipher);
  const variablePart = decoded.slice(HEADER_LEN);
  const plainBytes = Buffer.from(sample.plain, 'utf8');
  
  console.log(`Plain: "${sample.plain}" (${plainBytes.length} bytes)`);
  console.log(`Variable part: ${variablePart.toString('hex')} (${variablePart.length} bytes)`);
  
  // XOR the variable part with the plaintext
  const xorKey = Buffer.alloc(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i++) {
    xorKey[i] = variablePart[i] ^ plainBytes[i];
  }
  console.log(`XOR key (first ${plainBytes.length} bytes): ${xorKey.toString('hex')}`);
  console.log();
}

// Let's see if there's a pattern in the XOR keys
console.log('=== XOR Key Pattern Analysis ===\n');

// Compare XOR keys at same positions
const decoded1 = urlSafeBase64Decode(samples[0].cipher);
const decoded2 = urlSafeBase64Decode(samples[1].cipher);
const decoded3 = urlSafeBase64Decode(samples[2].cipher);

const var1 = decoded1.slice(HEADER_LEN);
const var2 = decoded2.slice(HEADER_LEN);
const var3 = decoded3.slice(HEADER_LEN);

const plain1 = Buffer.from(samples[0].plain, 'utf8');
const plain2 = Buffer.from(samples[1].plain, 'utf8');
const plain3 = Buffer.from(samples[2].plain, 'utf8');

// Calculate XOR keys
const key1 = Buffer.alloc(plain1.length);
const key2 = Buffer.alloc(plain2.length);
const key3 = Buffer.alloc(plain3.length);

for (let i = 0; i < plain1.length; i++) key1[i] = var1[i] ^ plain1[i];
for (let i = 0; i < plain2.length; i++) key2[i] = var2[i] ^ plain2[i];
for (let i = 0; i < plain3.length; i++) key3[i] = var3[i] ^ plain3[i];

console.log('XOR keys at each position:');
for (let i = 0; i < Math.max(key1.length, key2.length, key3.length); i++) {
  const k1 = i < key1.length ? key1[i].toString(16).padStart(2, '0') : '--';
  const k2 = i < key2.length ? key2[i].toString(16).padStart(2, '0') : '--';
  const k3 = i < key3.length ? key3[i].toString(16).padStart(2, '0') : '--';
  console.log(`  Position ${i}: ${k1} | ${k2} | ${k3} ${k1 === k2 && k2 === k3 ? '✓ SAME' : ''}`);
}

console.log('\n=== Trying to find the key ===\n');

// The XOR keys should be the same if it's a simple XOR cipher
// Let's check if the key is derived from something

// Try: key might be based on the header
const header = decoded1.slice(0, HEADER_LEN);
console.log('Header (hex):', header.toString('hex'));
console.log('Header (ascii):', header.toString('ascii').replace(/[^\x20-\x7e]/g, '.'));

// Try: key might be a repeating pattern
console.log('\nLooking for repeating key pattern...');

// Get more data by looking at the full variable parts
console.log('\nFull variable parts:');
console.log(`  test123: ${var1.toString('hex')}`);
console.log(`  hello:   ${var2.toString('hex')}`);
console.log(`  12345:   ${var3.toString('hex')}`);

// The variable parts have different lengths - this suggests the output length depends on input length
console.log('\nVariable part lengths:');
console.log(`  test123 (7 chars): ${var1.length} bytes`);
console.log(`  hello (5 chars):   ${var2.length} bytes`);
console.log(`  12345 (5 chars):   ${var3.length} bytes`);

// Let's try to decrypt using the derived key
console.log('\n=== Attempting Decryption ===\n');

// If we know the key pattern, we can decrypt
// Let's assume the key is: 9e 3d 9e 4d 9e 5d 9e (pattern from test123)
// Actually, let's derive the key from one sample and test on others

// Derive key from test123
const derivedKey = key1;
console.log('Derived key from test123:', derivedKey.toString('hex'));

// Try to decrypt hello using this key
const decryptedHello = Buffer.alloc(Math.min(derivedKey.length, var2.length));
for (let i = 0; i < decryptedHello.length; i++) {
  decryptedHello[i] = var2[i] ^ derivedKey[i];
}
console.log('Decrypted hello (using test123 key):', decryptedHello.toString('utf8'));

// Try to decrypt 12345 using this key
const decrypted12345 = Buffer.alloc(Math.min(derivedKey.length, var3.length));
for (let i = 0; i < decrypted12345.length; i++) {
  decrypted12345[i] = var3[i] ^ derivedKey[i];
}
console.log('Decrypted 12345 (using test123 key):', decrypted12345.toString('utf8'));

// The keys are different! This means the key depends on the plaintext somehow
// This is characteristic of a stream cipher or a cipher with feedback

console.log('\n=== Stream Cipher Analysis ===\n');

// Let's look at the relationship between plaintext and ciphertext more carefully
// In a stream cipher, C[i] = P[i] XOR K[i] where K depends on some state

// Let's see if there's a relationship between consecutive bytes
console.log('Byte-by-byte analysis for test123:');
for (let i = 0; i < plain1.length; i++) {
  const p = plain1[i];
  const c = var1[i];
  const k = p ^ c;
  console.log(`  P[${i}]=${p.toString(16).padStart(2,'0')} (${String.fromCharCode(p)}) ^ K[${i}]=${k.toString(16).padStart(2,'0')} = C[${i}]=${c.toString(16).padStart(2,'0')}`);
}

// Check if the cipher has any structure after the plaintext
console.log('\nBytes after plaintext:');
console.log(`  test123: ${var1.slice(plain1.length).toString('hex')}`);
console.log(`  hello:   ${var2.slice(plain2.length).toString('hex')}`);
console.log(`  12345:   ${var3.slice(plain3.length).toString('hex')}`);
