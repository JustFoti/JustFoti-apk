/**
 * Decode the DLHD stream page obfuscated data
 * The ZpQw9XkLmN8c3vR3 variable contains encoded stream configuration
 */

const fs = require('fs');

// Read the downloaded HTML
const html = fs.readFileSync('dlhd-stream-31.html', 'utf8');

// Extract the encoded string
const match = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
if (!match) {
  console.log('Could not find encoded string');
  process.exit(1);
}

const encoded = match[1];
console.log('Encoded string length:', encoded.length);
console.log('First 100 chars:', encoded.substring(0, 100));

// The encoding appears to be a custom base64-like encoding
// Looking at the deobfuscator function, it uses standard base64 alphabet
const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';

// Try standard base64 decode
try {
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  console.log('\n=== Standard Base64 Decode ===');
  console.log('Length:', decoded.length);
  console.log('First 500 chars:', decoded.substring(0, 500));
  
  // Check if it looks like valid data
  if (decoded.includes('http') || decoded.includes('m3u8') || decoded.includes('stream')) {
    console.log('\n*** FOUND STREAM DATA! ***');
  }
} catch (e) {
  console.log('Standard base64 failed:', e.message);
}

// The encoded string looks like it might be XOR'd or have a custom alphabet
// Let's analyze the character distribution
const charCount = {};
for (const c of encoded) {
  charCount[c] = (charCount[c] || 0) + 1;
}
console.log('\n=== Character Distribution ===');
const sortedChars = Object.entries(charCount).sort((a, b) => b[1] - a[1]);
console.log('Top 20 chars:', sortedChars.slice(0, 20).map(([c, n]) => `${c}:${n}`).join(', '));

// Check if it's a simple substitution cipher
// The encoded string has uppercase, lowercase, numbers, and some special chars
const hasLower = /[a-z]/.test(encoded);
const hasUpper = /[A-Z]/.test(encoded);
const hasDigits = /[0-9]/.test(encoded);
const hasSpecial = /[^a-zA-Z0-9]/.test(encoded);
console.log('\nCharacter types:', { hasLower, hasUpper, hasDigits, hasSpecial });

// Try XOR with common keys
console.log('\n=== XOR Decode Attempts ===');
for (const key of [0x20, 0x41, 0x61, 0x30, 0xFF]) {
  const xored = encoded.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join('');
  if (xored.includes('http') || xored.includes('.m3u8') || xored.includes('stream')) {
    console.log(`XOR key ${key.toString(16)}: FOUND STREAM DATA!`);
    console.log(xored.substring(0, 200));
  }
}

// Look for iframe sources in the HTML
console.log('\n=== Looking for iframes ===');
const iframeMatches = html.matchAll(/src=["']([^"']+)["']/gi);
for (const m of iframeMatches) {
  if (m[1].includes('http') && !m[1].includes('histats')) {
    console.log('iframe src:', m[1]);
  }
}

// Look for any URLs in the HTML
console.log('\n=== URLs in HTML ===');
const urlMatches = html.matchAll(/https?:\/\/[^\s"'<>]+/gi);
const urls = new Set();
for (const m of urlMatches) {
  if (!m[0].includes('histats') && !m[0].includes('google')) {
    urls.add(m[0]);
  }
}
urls.forEach(u => console.log(u));

// Look for the actual player/stream configuration
console.log('\n=== Looking for stream config ===');
const configPatterns = [
  /source:\s*["']([^"']+)["']/gi,
  /file:\s*["']([^"']+)["']/gi,
  /src:\s*["']([^"']+)["']/gi,
  /url:\s*["']([^"']+)["']/gi,
  /m3u8[^"']*["']([^"']+\.m3u8[^"']*)["']/gi,
];

for (const pattern of configPatterns) {
  const matches = html.matchAll(pattern);
  for (const m of matches) {
    console.log(`${pattern.source}: ${m[1]}`);
  }
}
