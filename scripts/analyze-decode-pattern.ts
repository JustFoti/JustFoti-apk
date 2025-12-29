#!/usr/bin/env bun
/**
 * Analyze the decoding pattern from captured data
 */

// Captured data from forensic analysis
const whatHeader = 'ISEEYOUtZWKuFoBQSfuWJvEZvyXVsjGe';
const encodedData = 'DJ`!qZ_~4z:Dc(Ed4?hyB&z{3c:^*}Er5%(w*{2"_`*2{Ix4|+CCuBG}`G69:5D>:s6?#+Cf4hh<8Gf($)&6d>^6xh&!t"<uc+}7v;9$JJIFhG_?r#+=hp!^=hg<sw\';x$vB';
const decodedUrl = 'https://lb5.strmd.top/secure/AitwNvRBQVNJjGqfGduxUUUSWYuxcVnJ/alpha/stream/nba-tv-1/1/playlist.m3u8';
const derivedKey = [44,62,20,81,2,96,112,81,88,24,15,106,16,92,55,9,80,17,28,22,50,9,9,30,80,22,72,59,5,60,44,6,66,107,94,37,104,42,100,108,21,10,109,67,29,14,28,65,4,126,22,22,38,21,30,8,24,36,96,87,112,26,37,82,74,27,87,16,80,95,49,3,85,5,71,82,90,38,75,92,82,4,23,25,85,17,46,90,25,17,74,72,7,86,18,24,80,94,69];

console.log('=== Decode Pattern Analysis ===\n');

// The key insight: the derived key is what we need to XOR with encoded data to get decoded URL
// Let's see if there's a pattern in how the key is generated

const whatBytes = whatHeader.split('').map(c => c.charCodeAt(0));
console.log('WHAT bytes:', whatBytes);
console.log('Derived key:', derivedKey.slice(0, 32));

// Check if key[i] = WHAT[i] XOR something constant
console.log('\n--- Check key[i] XOR WHAT[i] ---');
const xorWithWhat = derivedKey.slice(0, 32).map((k, i) => k ^ whatBytes[i]);
console.log('key XOR WHAT:', xorWithWhat);
console.log('As chars:', xorWithWhat.map(b => String.fromCharCode(b)).join(''));

// Check if the XOR result is the token from the URL
const token = 'AitwNvRBQVNJjGqfGduxUUUSWYuxcVnJ';
const tokenBytes = token.split('').map(c => c.charCodeAt(0));
console.log('\nToken bytes:', tokenBytes);

// Check if key[i] = WHAT[i] XOR token[i]
console.log('\n--- Check if key = WHAT XOR token ---');
const whatXorToken = whatBytes.map((w, i) => w ^ tokenBytes[i]);
console.log('WHAT XOR token:', whatXorToken);
console.log('Matches derived key:', JSON.stringify(whatXorToken) === JSON.stringify(derivedKey.slice(0, 32)));

// Check if key[i] = token[i] XOR WHAT[i]
console.log('\n--- Check if key = token XOR WHAT ---');
const tokenXorWhat = tokenBytes.map((t, i) => t ^ whatBytes[i]);
console.log('token XOR WHAT:', tokenXorWhat);
console.log('Matches derived key:', JSON.stringify(tokenXorWhat) === JSON.stringify(derivedKey.slice(0, 32)));

// So the pattern might be:
// encoded[i] XOR key[i] = decoded[i]
// where key[i] = WHAT[i % 32] XOR token[i % 32]
// But we don't know the token beforehand!

// Let's check if the key repeats every 32 bytes
console.log('\n--- Check if key repeats every 32 bytes ---');
for (let i = 32; i < derivedKey.length; i++) {
  const expected = derivedKey[i % 32];
  const actual = derivedKey[i];
  if (expected !== actual) {
    console.log(`Mismatch at ${i}: expected ${expected}, got ${actual}`);
  }
}

// Let's verify the decoding
console.log('\n--- Verify decoding ---');
let decoded = '';
for (let i = 0; i < encodedData.length; i++) {
  const keyByte = derivedKey[i % derivedKey.length];
  decoded += String.fromCharCode(encodedData.charCodeAt(i) ^ keyByte);
}
console.log('Decoded:', decoded);
console.log('Expected:', decodedUrl);
console.log('Match:', decoded === decodedUrl);

// The key question: how is the key derived?
// Hypothesis 1: key = WHAT XOR some_constant
// Hypothesis 2: key = derived from WHAT using some algorithm
// Hypothesis 3: key is sent separately (maybe in another header or field)

// Let's check if the key is related to the encoded data itself
console.log('\n--- Check if key is in encoded data ---');
// Maybe the first 32 bytes of encoded data ARE the key?
const first32Encoded = encodedData.slice(0, 32).split('').map(c => c.charCodeAt(0));
console.log('First 32 encoded bytes:', first32Encoded);

// Check if first32Encoded XOR WHAT = something meaningful
const first32XorWhat = first32Encoded.map((e, i) => e ^ whatBytes[i]);
console.log('First 32 encoded XOR WHAT:', first32XorWhat);
console.log('As chars:', first32XorWhat.map(b => String.fromCharCode(b)).join(''));

// Check if first 32 of decoded URL XOR WHAT = key
const first32Decoded = decodedUrl.slice(0, 32).split('').map(c => c.charCodeAt(0));
console.log('\nFirst 32 decoded bytes:', first32Decoded);
const first32DecodedXorWhat = first32Decoded.map((d, i) => d ^ whatBytes[i]);
console.log('First 32 decoded XOR WHAT:', first32DecodedXorWhat);

// Let's try a different approach: maybe the key is just WHAT repeated
console.log('\n--- Try decoding with just WHAT as key ---');
let decodedWithWhat = '';
for (let i = 0; i < encodedData.length; i++) {
  decodedWithWhat += String.fromCharCode(encodedData.charCodeAt(i) ^ whatBytes[i % 32]);
}
console.log('Decoded with WHAT:', decodedWithWhat);

// The result should be the URL XOR'd with something
// Let's see what that something is
console.log('\n--- What is decodedWithWhat XOR decodedUrl? ---');
const diff = [];
for (let i = 0; i < Math.min(decodedWithWhat.length, decodedUrl.length); i++) {
  diff.push(decodedWithWhat.charCodeAt(i) ^ decodedUrl.charCodeAt(i));
}
console.log('Difference:', diff.slice(0, 64));
console.log('As chars:', diff.slice(0, 64).map(b => String.fromCharCode(b)).join(''));

// This difference should be the "extra" XOR applied
// If it's constant or has a pattern, we can figure out the algorithm

// Check if the difference is the token repeated
console.log('\n--- Is difference the token? ---');
let matchesToken = true;
for (let i = 0; i < diff.length; i++) {
  if (diff[i] !== tokenBytes[i % 32]) {
    matchesToken = false;
    console.log(`Mismatch at ${i}: diff=${diff[i]}, token=${tokenBytes[i % 32]}`);
    break;
  }
}
console.log('Difference matches token repeated:', matchesToken);

// So the formula is:
// decoded = encoded XOR WHAT XOR token
// But we need to know the token!

// Wait - maybe the token IS derivable from WHAT somehow?
// Let's check if token = f(WHAT) for some function f

console.log('\n--- Analyze token vs WHAT relationship ---');
console.log('WHAT:', whatHeader);
console.log('Token:', token);

// Check character by character
for (let i = 0; i < 32; i++) {
  const w = whatBytes[i];
  const t = tokenBytes[i];
  const xor = w ^ t;
  const diff = t - w;
  console.log(`[${i}] WHAT=${w} (${whatHeader[i]}) token=${t} (${token[i]}) XOR=${xor} diff=${diff}`);
}

// Maybe the token is derived from WHAT using a specific algorithm
// Let's check if there's a consistent transformation

console.log('\n--- Check for consistent XOR value ---');
const xorValues = whatBytes.map((w, i) => w ^ tokenBytes[i]);
const uniqueXors = [...new Set(xorValues)];
console.log('XOR values:', xorValues);
console.log('Unique XOR values:', uniqueXors.length);

// If all XOR values are the same, token = WHAT XOR constant
// If not, there's a more complex relationship

// Let's check if the XOR values follow a pattern
console.log('\n--- Check XOR value pattern ---');
for (let i = 0; i < xorValues.length - 1; i++) {
  console.log(`XOR[${i}] to XOR[${i+1}]: diff=${xorValues[i+1] - xorValues[i]}`);
}
