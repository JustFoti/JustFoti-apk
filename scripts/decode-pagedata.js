#!/usr/bin/env node
/**
 * Try to decode MegaUp __PAGE_DATA
 * The data appears to be custom base64 with a different alphabet
 */

const encoded = '3wMOLPOCFprWglc038GT4eurZl2CnZqMNWZGsFh3nC2jPP3h3zMgHl9PKMuUor__SJIP94g4uw4';

console.log('Encoded:', encoded);
console.log('Length:', encoded.length);

// Standard base64 alphabet
const STD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Try different custom alphabets
const alphabets = [
  // URL-safe base64
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  // Reversed
  '/+9876543210zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA',
  // Shifted
  'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm0123456789+/',
  // Numbers first
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/',
  // Lowercase first
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/',
];

function decodeWithAlphabet(data, customAlphabet) {
  // Convert from custom alphabet to standard
  let standardized = '';
  for (const char of data) {
    const idx = customAlphabet.indexOf(char);
    if (idx >= 0) {
      standardized += STD_ALPHABET[idx];
    } else if (char === '=') {
      standardized += '=';
    } else {
      return null; // Invalid character
    }
  }
  
  try {
    return Buffer.from(standardized, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

console.log('\n=== Trying different alphabets ===');
for (let i = 0; i < alphabets.length; i++) {
  const decoded = decodeWithAlphabet(encoded, alphabets[i]);
  if (decoded && (decoded.includes('http') || decoded.includes('file') || decoded.includes('m3u8'))) {
    console.log(`Alphabet ${i} works:`, decoded);
  }
}

// Try to figure out the alphabet from the encoded data
console.log('\n=== Character frequency ===');
const freq = {};
for (const c of encoded) {
  freq[c] = (freq[c] || 0) + 1;
}
console.log('Unique chars:', Object.keys(freq).sort().join(''));
console.log('Count:', Object.keys(freq).length);

// The data might be encrypted, not just encoded
// Try XOR with the video ID from the URL
const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
console.log('\n=== XOR with video ID ===');
let xorResult = '';
for (let i = 0; i < encoded.length; i++) {
  xorResult += String.fromCharCode(encoded.charCodeAt(i) ^ videoId.charCodeAt(i % videoId.length));
}
console.log('XOR result:', xorResult.substring(0, 100));

// Try RC4-like decryption
function rc4(key, data) {
  const S = [];
  for (let i = 0; i < 256; i++) S[i] = i;
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key.charCodeAt(i % key.length)) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  let result = '';
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    result += String.fromCharCode(data.charCodeAt(k) ^ S[(S[i] + S[j]) % 256]);
  }
  return result;
}

console.log('\n=== RC4 with video ID ===');
const rc4Result = rc4(videoId, encoded);
console.log('RC4 result:', rc4Result.substring(0, 100));

// Try base64 decode first, then decrypt
console.log('\n=== Base64 then XOR ===');
try {
  const b64decoded = Buffer.from(encoded, 'base64');
  let xorB64 = '';
  for (let i = 0; i < b64decoded.length; i++) {
    xorB64 += String.fromCharCode(b64decoded[i] ^ videoId.charCodeAt(i % videoId.length));
  }
  console.log('Result:', xorB64.substring(0, 100));
} catch (e) {
  console.log('Failed:', e.message);
}
