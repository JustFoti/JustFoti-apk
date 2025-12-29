#!/usr/bin/env bun
/**
 * Analyze the base64 decoding step
 */

// From the capture:
const base64Input = 'A3BYEDFXAjpTA3MiGjcMFnADVi1QAj1DAU0mFiQXHCoXBytGFW4aU0QoGwYEDDobTmAdFH8YAV89VXpHGTZbIidAAyVZHxV3VWVI';
const whatHeader = 'ISEEYOUgQeUcRzjRwjpXDmfwlUEyqOzR';
const decodedUrl = 'https://lb3.strmd.top/secure/FFPbIEIqZnQkpZZeZglvOleXrMECezAF/alpha/stream/nba-tv-1/1/playlist.m3u8';

console.log('=== Base64 Decode Analysis ===\n');

// Decode the base64
const decoded = Buffer.from(base64Input, 'base64').toString('binary');
console.log('Base64 decoded length:', decoded.length);
console.log('Base64 decoded bytes:', Array.from(decoded).map(c => c.charCodeAt(0)));
console.log('Base64 decoded as string:', decoded);

// The decoded data should be XOR'd with something to get the URL
console.log('\n--- XOR Analysis ---');

// Try XOR with WHAT header
let xorWithWhat = '';
for (let i = 0; i < decoded.length; i++) {
  xorWithWhat += String.fromCharCode(decoded.charCodeAt(i) ^ whatHeader.charCodeAt(i % whatHeader.length));
}
console.log('XOR with WHAT:', xorWithWhat);

// Check if this matches the URL
console.log('\nExpected URL:', decodedUrl);
console.log('XOR result matches URL:', xorWithWhat === decodedUrl);

// If not, let's find what key would produce the URL
console.log('\n--- Derive the actual key ---');
const actualKey: number[] = [];
for (let i = 0; i < Math.min(decoded.length, decodedUrl.length); i++) {
  actualKey.push(decoded.charCodeAt(i) ^ decodedUrl.charCodeAt(i));
}
console.log('Actual key bytes:', actualKey);
console.log('Actual key as string:', actualKey.map(b => String.fromCharCode(b)).join(''));

// Check if actual key is related to WHAT
console.log('\n--- Compare actual key to WHAT ---');
const whatBytes = whatHeader.split('').map(c => c.charCodeAt(0));
console.log('WHAT bytes:', whatBytes);

// Check if key[i] = WHAT[i] XOR something
const keyXorWhat = actualKey.map((k, i) => k ^ whatBytes[i % whatBytes.length]);
console.log('Key XOR WHAT:', keyXorWhat);
console.log('As string:', keyXorWhat.map(b => String.fromCharCode(b)).join(''));

// Check if the XOR result is constant
const uniqueXors = [...new Set(keyXorWhat)];
console.log('Unique XOR values:', uniqueXors.length);
if (uniqueXors.length === 1) {
  console.log('Constant XOR value:', uniqueXors[0]);
}

// Check if key is WHAT with some transformation
console.log('\n--- Check key patterns ---');

// Is key = WHAT reversed?
const whatReversed = whatHeader.split('').reverse().join('');
let matchesReversed = true;
for (let i = 0; i < actualKey.length; i++) {
  if (actualKey[i] !== whatReversed.charCodeAt(i % whatReversed.length)) {
    matchesReversed = false;
    break;
  }
}
console.log('Key matches WHAT reversed:', matchesReversed);

// Is key = WHAT with index transformation?
for (let mult = 1; mult <= 16; mult++) {
  let matches = 0;
  for (let i = 0; i < actualKey.length; i++) {
    if (actualKey[i] === whatBytes[(i * mult) % whatBytes.length]) {
      matches++;
    }
  }
  if (matches > actualKey.length * 0.8) {
    console.log(`Key matches WHAT[(i * ${mult}) % 32]: ${matches}/${actualKey.length}`);
  }
}

// Check if key is derived from the token in the URL
const token = 'FFPbIEIqZnQkpZZeZglvOleXrMECezAF';
const tokenBytes = token.split('').map(c => c.charCodeAt(0));
console.log('\nToken from URL:', token);
console.log('Token bytes:', tokenBytes);

// Is key = token?
let matchesToken = true;
for (let i = 0; i < actualKey.length; i++) {
  if (actualKey[i] !== tokenBytes[i % tokenBytes.length]) {
    matchesToken = false;
    break;
  }
}
console.log('Key matches token:', matchesToken);

// Is key = WHAT XOR token?
const whatXorToken = whatBytes.map((w, i) => w ^ tokenBytes[i]);
console.log('\nWHAT XOR token:', whatXorToken);
let matchesWhatXorToken = true;
for (let i = 0; i < actualKey.length; i++) {
  if (actualKey[i] !== whatXorToken[i % whatXorToken.length]) {
    matchesWhatXorToken = false;
    break;
  }
}
console.log('Key matches WHAT XOR token:', matchesWhatXorToken);

// Let's try to decode with just WHAT and see what we get
console.log('\n--- Decode with WHAT ---');
let decodedWithWhat = '';
for (let i = 0; i < decoded.length; i++) {
  decodedWithWhat += String.fromCharCode(decoded.charCodeAt(i) ^ whatBytes[i % whatBytes.length]);
}
console.log('Decoded with WHAT:', decodedWithWhat);

// The difference between decodedWithWhat and decodedUrl should be the "extra" key
console.log('\n--- Difference analysis ---');
const diff: number[] = [];
for (let i = 0; i < Math.min(decodedWithWhat.length, decodedUrl.length); i++) {
  diff.push(decodedWithWhat.charCodeAt(i) ^ decodedUrl.charCodeAt(i));
}
console.log('Difference (decodedWithWhat XOR decodedUrl):', diff);
console.log('As string:', diff.map(b => String.fromCharCode(b)).join(''));

// Is the difference the token?
let diffMatchesToken = true;
for (let i = 0; i < diff.length; i++) {
  if (diff[i] !== tokenBytes[i % tokenBytes.length]) {
    diffMatchesToken = false;
    break;
  }
}
console.log('Difference matches token:', diffMatchesToken);

// So the formula might be:
// decoded = base64Decode(response) XOR WHAT XOR token
// But we don't know the token beforehand!

// Let's check if the token is derivable from WHAT
console.log('\n--- Token derivation from WHAT ---');
for (let i = 0; i < 32; i++) {
  const w = whatBytes[i];
  const t = tokenBytes[i];
  const xor = w ^ t;
  console.log(`[${i}] WHAT=${w} (${whatHeader[i]}) token=${t} (${token[i]}) XOR=${xor}`);
}
