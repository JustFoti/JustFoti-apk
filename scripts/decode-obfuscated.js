/**
 * Decode the obfuscated script to find any initialization logic
 */

const fs = require('fs');

// The first script has a large obfuscated string
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

// Find the obfuscated string
const obfMatch = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
if (!obfMatch) {
  console.log('Could not find obfuscated string');
  process.exit(1);
}

const obfString = obfMatch[1];
console.log('Obfuscated string length:', obfString.length);
console.log('First 100 chars:', obfString.substring(0, 100));

// This looks like base64 but with a custom alphabet
// Let's try to decode it

// Standard base64 alphabet
const stdAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

// Try standard base64 decode
try {
  const decoded = Buffer.from(obfString, 'base64').toString('utf8');
  console.log('\nStandard base64 decode (first 200 chars):');
  console.log(decoded.substring(0, 200));
} catch (e) {
  console.log('Standard base64 failed:', e.message);
}

// The script has a deobfuscation function _0x3127
// Let's look for the string array _0x4c84

const arrayMatch = html.match(/function _0x4c84\(\)\{const [^=]+=\[([^\]]+)\]/);
if (arrayMatch) {
  console.log('\n\nFound string array, first 500 chars:');
  console.log(arrayMatch[1].substring(0, 500));
}

// Look for any URLs in the obfuscated content
const urlPattern = /https?:\/\/[a-z0-9.-]+/gi;
const urls = obfString.match(urlPattern);
if (urls) {
  console.log('\n\nURLs found in obfuscated string:');
  [...new Set(urls)].forEach(u => console.log(' ', u));
}

// The obfuscated script likely sets up some global state or cookies
// Let's look for document.cookie or localStorage usage

const cookiePattern = /cookie|localStorage|sessionStorage/gi;
const cookieMatches = html.match(cookiePattern);
if (cookieMatches) {
  console.log('\n\nStorage/cookie references:', cookieMatches.length);
}

// Look for any fetch or XMLHttpRequest in the first script
const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptNum = 0;

while ((match = scriptPattern.exec(html)) !== null) {
  scriptNum++;
  const content = match[1];
  
  if (content.includes("window['ZpQw9XkLmN8c3vR3']")) {
    console.log(`\n\nScript ${scriptNum} (obfuscated) analysis:`);
    console.log('Length:', content.length);
    
    // Check for network calls
    if (content.includes('fetch')) console.log('- Contains fetch');
    if (content.includes('XMLHttpRequest')) console.log('- Contains XMLHttpRequest');
    if (content.includes('WebSocket')) console.log('- Contains WebSocket');
    
    // Check for crypto
    if (content.includes('crypto')) console.log('- Contains crypto');
    if (content.includes('sha256') || content.includes('SHA256')) console.log('- Contains SHA256');
    if (content.includes('md5') || content.includes('MD5')) console.log('- Contains MD5');
    
    // Check for fingerprinting
    if (content.includes('canvas')) console.log('- Contains canvas');
    if (content.includes('webgl')) console.log('- Contains webgl');
    if (content.includes('fingerprint')) console.log('- Contains fingerprint');
  }
}

// The key question: does the first script make any network requests
// that set up authentication for the manifest server?

console.log('\n\n=== Hypothesis ===');
console.log('The obfuscated script might:');
console.log('1. Generate a fingerprint/token');
console.log('2. Make a request to set up server-side auth');
console.log('3. The manifest hash is validated against this auth');
