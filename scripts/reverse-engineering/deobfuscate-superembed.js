/**
 * Superembed JavaScript Deobfuscator
 * 
 * This script extracts and deobfuscates the JavaScript code from Superembed
 * to understand the decoding mechanism.
 */

const fs = require('fs');
const path = require('path');

// Read the captured HTML
const htmlPath = path.join(__dirname, 'debug-srcrcp-550.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('=== EXTRACTING OBFUSCATED JAVASCRIPT ===\n');

// Extract the main obfuscated script (the one with _0x5bd0 array)
const scriptMatch = html.match(/<script[^>]*>([\s\S]*?var _0x5bd0=\[[\s\S]*?\}\(\)\);[\s\S]*?)<\/script>/);

if (!scriptMatch) {
    console.error('Could not find obfuscated script!');
    process.exit(1);
}

const obfuscatedCode = scriptMatch[1];
console.log('Found obfuscated script, length:', obfuscatedCode.length);

// Save the obfuscated code
fs.writeFileSync(path.join(__dirname, 'extracted-obfuscated.js'), obfuscatedCode);
console.log('Saved to: extracted-obfuscated.js\n');

// Now let's analyze the structure
console.log('=== ANALYZING STRUCTURE ===\n');

// Extract the string array
const arrayMatch = obfuscatedCode.match(/var _0x5bd0=\[([\s\S]*?)\];/);
if (arrayMatch) {
    const arrayContent = arrayMatch[1];
    const strings = arrayContent.match(/'([^']+)'/g);
    console.log(`String array contains ${strings ? strings.length : 0} strings\n`);

    // Show first 20 strings
    if (strings) {
        console.log('First 20 strings:');
        strings.slice(0, 20).forEach((str, i) => {
            console.log(`  ${i}: ${str}`);
        });
    }
}

// Look for the base64 decoder function
console.log('\n=== LOOKING FOR BASE64 DECODER ===\n');

// The pattern shows a base64 decoder with custom alphabet
const decoderPattern = /_0x32e7\['oaFOvD'\]=function\((_0x[a-z0-9]+)\)\{[\s\S]*?var (_0x[a-z0-9]+)='([^']+)';/;
const decoderMatch = obfuscatedCode.match(decoderPattern);

if (decoderMatch) {
    console.log('Found base64 decoder!');
    console.log('Alphabet:', decoderMatch[3]);
}

// Extract the actual decoding logic
console.log('\n=== RECONSTRUCTING DECODER ===\n');

// Let's create a clean version of the decoder
const cleanDecoder = `
// Reconstructed Superembed Decoder
function base64Decode(input) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';
  let output = '';
  
  for (let i = 0, char1, char2, enc1, enc2, enc3, enc4; char2 = input.charAt(i++);) {
    char2 = alphabet.indexOf(char2);
    if (~char2) {
      enc1 = i % 4 ? enc1 * 64 + char2 : char2;
      if (i++ % 4) {
        char1 = 255 & enc1 >> (-2 * i & 6);
        output += String.fromCharCode(char1);
      }
    }
  }
  return output;
}

function urldecode(str) {
  const decoded = base64Decode(str);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += '%' + ('00' + decoded.charCodeAt(i).toString(16)).slice(-2);
  }
  return decodeURIComponent(result);
}

// Test with the play parameter from the HTML
const testParam = 'S0dhU1FEaUcxTUlhNTdMUFRGb0tTaXFUVStmQnNRdkFNcXFtOWtBaWljR09nQ1JNd210bmdFeTN5RGk1RFdRN2Q3SVcvT09YSVo1V0pHbzZjNlhLN2F4MDNZaWhzN2hDUDhRV1dtMFRoUnl4d0YyNFJWQVRlOTAvLzBEay9ZODZwOFdFQnJYUTYvUWRGVjJNQ0ZqbndURzY5QT09';

console.log('Testing decoder with play parameter...');
try {
  const decoded = urldecode(testParam);
  console.log('Decoded:', decoded);
} catch (e) {
  console.error('Decode failed:', e.message);
}
`;

fs.writeFileSync(path.join(__dirname, 'clean-decoder.js'), cleanDecoder);
console.log('Created clean decoder: clean-decoder.js');

// Now execute it
console.log('\n=== TESTING DECODER ===\n');
eval(cleanDecoder);
