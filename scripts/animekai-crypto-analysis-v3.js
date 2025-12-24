/**
 * AnimeKai Encryption Analysis v3
 * 
 * Key discovery: window.__$ contains a 108-char key that's used for encryption
 * 
 * Key: ZZYdbXagjEpeaR4SF5q7C4ViIh-6IBnxB3hshWTR2k8-ZaFMdAJx0xzxNjZL21y9xn2Z7m1V_jIQEWMmAM8Zb0uM9Se8Ur4SonJLdacBah4Y
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

// The key from window.__$
const KEY = 'ZZYdbXagjEpeaR4SF5q7C4ViIh-6IBnxB3hshWTR2k8-ZaFMdAJx0xzxNjZL21y9xn2Z7m1V_jIQEWMmAM8Zb0uM9Se8Ur4SonJLdacBah4Y';

console.log('=== AnimeKai Key Analysis ===\n');
console.log('Key:', KEY);
console.log('Key length:', KEY.length);

// Decode the key
const keyDecoded = urlSafeBase64Decode(KEY);
console.log('Key decoded (hex):', keyDecoded.toString('hex'));
console.log('Key decoded length:', keyDecoded.length, 'bytes');

// Test data
const samples = [
  { plain: 'test123', cipher: 'xQm9tJfLwGhz_0Eq8S_YAHYkwp-q6vLfm50W5eFnyd12nDopajWPyD4' },
  { plain: 'hello', cipher: 'xQm9tJfLwGhz_0Eq8S_YAHYkwp-qUvLfm50W5eFnyd06nNopBQ' },
  { plain: '12345', cipher: 'xQm9tJfLwGhz_0Eq8S_YAHYkwp-qbfLfm50W5QJnyd1mnDspaA' },
];

console.log('\n=== Testing Key-based Decryption ===\n');

// The cipher has a 21-byte header
const HEADER_LEN = 21;

for (const sample of samples) {
  const cipherDecoded = urlSafeBase64Decode(sample.cipher);
  const header = cipherDecoded.slice(0, HEADER_LEN);
  const cipherBody = cipherDecoded.slice(HEADER_LEN);
  
  console.log(`\nPlain: "${sample.plain}"`);
  console.log(`Cipher body: ${cipherBody.toString('hex')}`);
  
  // Try XOR with key at different positions
  for (let keyOffset = 0; keyOffset < 10; keyOffset++) {
    const decrypted = Buffer.alloc(sample.plain.length);
    for (let i = 0; i < sample.plain.length; i++) {
      decrypted[i] = cipherBody[i] ^ keyDecoded[(keyOffset + i) % keyDecoded.length];
    }
    const decryptedStr = decrypted.toString('utf8');
    const isMatch = decryptedStr === sample.plain;
    if (isMatch || keyOffset < 3) {
      console.log(`  Key offset ${keyOffset}: "${decryptedStr}" ${isMatch ? '✓ MATCH!' : ''}`);
    }
  }
}

// Try to find the correct key offset by brute force
console.log('\n=== Brute Force Key Offset ===\n');

const testSample = samples[0];
const testCipher = urlSafeBase64Decode(testSample.cipher).slice(HEADER_LEN);
const testPlain = Buffer.from(testSample.plain, 'utf8');

for (let keyOffset = 0; keyOffset < keyDecoded.length; keyOffset++) {
  const decrypted = Buffer.alloc(testPlain.length);
  let match = true;
  for (let i = 0; i < testPlain.length; i++) {
    decrypted[i] = testCipher[i] ^ keyDecoded[(keyOffset + i) % keyDecoded.length];
    if (decrypted[i] !== testPlain[i]) {
      match = false;
      break;
    }
  }
  if (match) {
    console.log(`Found matching key offset: ${keyOffset}`);
    console.log(`Key bytes at offset: ${keyDecoded.slice(keyOffset, keyOffset + 10).toString('hex')}`);
  }
}

// The key might be used differently - let's try XOR with the header
console.log('\n=== Header XOR Analysis ===\n');

const header = urlSafeBase64Decode(samples[0].cipher).slice(0, HEADER_LEN);
console.log('Header:', header.toString('hex'));

// XOR header with key
const headerXorKey = Buffer.alloc(HEADER_LEN);
for (let i = 0; i < HEADER_LEN; i++) {
  headerXorKey[i] = header[i] ^ keyDecoded[i % keyDecoded.length];
}
console.log('Header XOR Key:', headerXorKey.toString('hex'));
console.log('Header XOR Key (ascii):', headerXorKey.toString('ascii').replace(/[^\x20-\x7e]/g, '.'));

// Maybe the encryption uses a derived key
console.log('\n=== Derived Key Analysis ===\n');

// The cipher body starts at byte 21
// Let's see what happens if we XOR the cipher body with different parts of the key

const cipherBody = urlSafeBase64Decode(samples[0].cipher).slice(HEADER_LEN);
const plainBytes = Buffer.from(samples[0].plain, 'utf8');

// Calculate what the key should be
const derivedKey = Buffer.alloc(plainBytes.length);
for (let i = 0; i < plainBytes.length; i++) {
  derivedKey[i] = cipherBody[i] ^ plainBytes[i];
}
console.log('Derived key from test123:', derivedKey.toString('hex'));

// Check if this derived key appears in the main key
const derivedKeyHex = derivedKey.toString('hex');
const keyHex = keyDecoded.toString('hex');
const keyIndex = keyHex.indexOf(derivedKeyHex.slice(0, 4));
console.log('Derived key pattern found in main key at index:', keyIndex);

// Let's try a different approach - maybe the key is used as a seed
console.log('\n=== Stream Cipher with Key as Seed ===\n');

// Common stream cipher: key[i] = f(key, i)
// Let's see if there's a pattern

// Calculate the XOR key for each sample
for (const sample of samples) {
  const cipher = urlSafeBase64Decode(sample.cipher).slice(HEADER_LEN);
  const plain = Buffer.from(sample.plain, 'utf8');
  const xorKey = Buffer.alloc(plain.length);
  for (let i = 0; i < plain.length; i++) {
    xorKey[i] = cipher[i] ^ plain[i];
  }
  console.log(`${sample.plain}: XOR key = ${xorKey.toString('hex')}`);
}

// The XOR keys are different for each plaintext!
// This suggests the key depends on the plaintext (like a MAC or hash-based cipher)
