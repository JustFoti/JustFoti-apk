// Test if 1movies data field is directly usable
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

// Encryption keys from the original extractor
const AES_KEY = new Uint8Array([3,75,207,198,39,85,65,255,64,89,191,251,35,214,209,210,62,164,155,85,247,158,167,48,172,84,13,18,19,166,19,57]);
const AES_IV = new Uint8Array([162,231,173,134,84,100,241,33,5,233,223,132,245,189,171,237]);
const XOR_KEY = new Uint8Array([170,162,126,126,60,255,136,130,133]);

const STANDARD_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const SHUFFLED_ALPHABET = "TuzHOxl7b0RW9o_1FPV3eGfmL4Z5pD8cahBQr2U-6yvEYwngXCdJjANtqKIMiSks";

// Build reverse char map for decoding
const REVERSE_CHAR_MAP = new Map();
for (let i = 0; i < SHUFFLED_ALPHABET.length; i++) {
  REVERSE_CHAR_MAP.set(SHUFFLED_ALPHABET[i], STANDARD_ALPHABET[i]);
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function base64UrlToBytes(base64url) {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (base64.length % 4) base64 += '=';
  // Decode
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Reverse the encoding: char substitution → base64url decode → XOR → hex decode → AES decrypt
async function decodePageData(encoded) {
  console.log('Decoding pageData...');
  console.log('  Input length:', encoded.length);
  
  // Step 1: Reverse character substitution
  let step1 = '';
  for (const char of encoded) {
    step1 += REVERSE_CHAR_MAP.get(char) || char;
  }
  console.log('  After char substitution:', step1.substring(0, 50) + '...');
  
  // Step 2: Base64url decode
  let step2;
  try {
    step2 = base64UrlToBytes(step1);
    console.log('  After base64url decode:', step2.length, 'bytes');
  } catch (e) {
    console.log('  Base64url decode failed:', e.message);
    return null;
  }
  
  // Step 3: XOR decode
  let step3 = '';
  for (let i = 0; i < step2.length; i++) {
    step3 += String.fromCharCode(step2[i] ^ XOR_KEY[i % XOR_KEY.length]);
  }
  console.log('  After XOR:', step3.substring(0, 50) + '...');
  
  // Step 4: Hex decode
  let step4;
  try {
    step4 = hexToBytes(step3);
    console.log('  After hex decode:', step4.length, 'bytes');
  } catch (e) {
    console.log('  Hex decode failed:', e.message);
    return null;
  }
  
  // Step 5: AES decrypt
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      AES_KEY.buffer,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: AES_IV.buffer },
      key,
      step4.buffer
    );
    
    const result = new TextDecoder().decode(decrypted);
    console.log('  After AES decrypt:', result.substring(0, 100) + '...');
    return result;
  } catch (e) {
    console.log('  AES decrypt failed:', e.message);
    return null;
  }
}

async function test() {
  console.log('Testing 1movies data decoding...\n');
  
  // Fetch the page
  const pageResponse = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await pageResponse.text();
  
  // Extract pageData
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  if (!pageData) {
    console.log('No pageData found');
    return;
  }
  
  console.log('pageData:', pageData.substring(0, 80) + '...\n');
  
  // Try to decode
  const decoded = await decodePageData(pageData);
  
  if (decoded) {
    console.log('\n=== Decoded Result ===');
    console.log(decoded);
  }
}

test().catch(console.error);
