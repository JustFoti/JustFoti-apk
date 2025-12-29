#!/usr/bin/env bun
/**
 * Analyze the XOR key pattern from captured data
 * 
 * From the capture:
 * - WHAT header: ISEEYOUHHJxHZXsxGmDUuwgUexoDNixe
 * - Token in URL: yIsnDojfHdjyivQHdhDaAxleLbqGrOyP
 * - Encoded string: a<9"56$D!)3+Js4t+5u_B#g|Gv9tdx:4+##vfe?KD;ycJ3:Hy2...
 * - Actual XOR key: [9, 72, 77, 82, 70, 12, 11, 107, 77, 75, 6, 5, 57, 7, 70, 25, 79, 27, 1, 48, 50, 12, 20, 25, 36, 3, 75, 17, 75, 1, 115, 71]
 * - WHAT bytes: [73, 83, 69, 69, 89, 79, 85, 72, 72, 74, 120, 72, 90, 88, 115, 120, 71, 109, 68, 85, 117, 119, 103, 85, 101, 120, 111, 68, 78, 105, 120, 101]
 */

// Data from the capture
const whatHeader = 'ISEEYOUHHJxHZXsxGmDUuwgUexoDNixe';
const token = 'yIsnDojfHdjyivQHdhDaAxleLbqGrOyP';
const encodedStr = 'a<9"56$D!)3+Js4t+5u_B#g|Gv9tdx:4+##vfe?KD;ycJ3:Hy2<Ks8r%z5:":E@?@&5v^(gs)4^Ee:`9<f=`E^J~AEx6uG4^bA2ad}sD`yI?^5<zAa=)6b%C9;<2Zxw!%5+H';
const actualKey = [9, 72, 77, 82, 70, 12, 11, 107, 77, 75, 6, 5, 57, 7, 70, 25, 79, 27, 1, 48, 50, 12, 20, 25, 36, 3, 75, 17, 75, 1, 115, 71];
const whatBytes = [73, 83, 69, 69, 89, 79, 85, 72, 72, 74, 120, 72, 90, 88, 115, 120, 71, 109, 68, 85, 117, 119, 103, 85, 101, 120, 111, 68, 78, 105, 120, 101];

console.log('=== Analyzing XOR Key Pattern ===\n');

// The XOR between actual key and WHAT bytes
const xorWithWhat = actualKey.map((k, i) => k ^ whatBytes[i]);
console.log('XOR between key and WHAT:', xorWithWhat);
console.log('As chars:', xorWithWhat.map(b => String.fromCharCode(b)).join(''));

// Check if XOR values form a pattern
console.log('\nLooking for patterns in XOR values:');

// Check if XOR values are related to position
console.log('\nXOR[i] vs i:');
for (let i = 0; i < 10; i++) {
  console.log(`  [${i}] XOR=${xorWithWhat[i]} i=${i} i*8=${i*8} i^64=${i^64}`);
}

// Check if XOR values are related to the expected URL
const expectedUrl = 'https://lb5.strmd.top/secure/' + token + '/alpha/stream/nba-tv-1/1/playlist.m3u8';
console.log('\nExpected URL:', expectedUrl);

// The key might be derived from the URL itself
console.log('\nChecking if key is derived from URL:');
for (let i = 0; i < 32; i++) {
  const urlByte = expectedUrl.charCodeAt(i);
  const keyByte = actualKey[i];
  console.log(`  [${i}] URL='${expectedUrl[i]}' (${urlByte}) key=${keyByte} XOR=${urlByte ^ keyByte}`);
}

// The key might be: WHAT[i] XOR something_derived_from_position
console.log('\n=== Trying to find the formula ===');

// Try: key[i] = WHAT[i] XOR (i * constant)
for (let mult = 1; mult <= 20; mult++) {
  let matches = 0;
  for (let i = 0; i < 32; i++) {
    if ((whatBytes[i] ^ (i * mult)) === actualKey[i]) {
      matches++;
    }
  }
  if (matches > 5) {
    console.log(`WHAT[i] XOR (i * ${mult}): ${matches}/32 matches`);
  }
}

// Try: key[i] = WHAT[i] XOR (constant)
for (let constant = 0; constant < 256; constant++) {
  let matches = 0;
  for (let i = 0; i < 32; i++) {
    if ((whatBytes[i] ^ constant) === actualKey[i]) {
      matches++;
    }
  }
  if (matches > 5) {
    console.log(`WHAT[i] XOR ${constant}: ${matches}/32 matches`);
  }
}

// Try: key[i] = WHAT[(i + offset) % 32]
for (let offset = 0; offset < 32; offset++) {
  let matches = 0;
  for (let i = 0; i < 32; i++) {
    if (whatBytes[(i + offset) % 32] === actualKey[i]) {
      matches++;
    }
  }
  if (matches > 5) {
    console.log(`WHAT[(i + ${offset}) % 32]: ${matches}/32 matches`);
  }
}

// Try: key[i] = WHAT[i] XOR WHAT[(i + offset) % 32]
for (let offset = 1; offset < 32; offset++) {
  let matches = 0;
  for (let i = 0; i < 32; i++) {
    if ((whatBytes[i] ^ whatBytes[(i + offset) % 32]) === actualKey[i]) {
      matches++;
    }
  }
  if (matches > 5) {
    console.log(`WHAT[i] XOR WHAT[(i + ${offset}) % 32]: ${matches}/32 matches`);
  }
}

// The key might be completely different - let's check if it's related to the token
console.log('\n=== Checking relationship with token ===');
const tokenBytes = Array.from(token).map(c => c.charCodeAt(0));
console.log('Token bytes:', tokenBytes);

// Check if key[i] = token[i] XOR something
for (let i = 0; i < 32; i++) {
  const xorWithToken = actualKey[i] ^ tokenBytes[i];
  console.log(`  [${i}] key=${actualKey[i]} token=${tokenBytes[i]} XOR=${xorWithToken} (${String.fromCharCode(xorWithToken)})`);
}

// The XOR with token might reveal a pattern
const xorWithToken = actualKey.map((k, i) => k ^ tokenBytes[i]);
console.log('\nXOR with token:', xorWithToken);
console.log('As chars:', xorWithToken.map(b => String.fromCharCode(b)).join(''));

// Check if XOR with token equals WHAT header
console.log('\nXOR with token vs WHAT:');
for (let i = 0; i < 32; i++) {
  console.log(`  [${i}] XOR_token=${xorWithToken[i]} WHAT=${whatBytes[i]} match=${xorWithToken[i] === whatBytes[i]}`);
}

// Maybe the formula is: encoded[i] XOR key[i] = URL[i]
// And key[i] = token[i] XOR WHAT[i]
console.log('\n=== Testing: key = token XOR WHAT ===');
const testKey = tokenBytes.map((t, i) => t ^ whatBytes[i]);
console.log('Test key:', testKey);

// Try decoding with this key
let decoded = '';
const encodedBytes = Array.from(encodedStr).map(c => c.charCodeAt(0));
for (let i = 0; i < encodedBytes.length; i++) {
  decoded += String.fromCharCode(encodedBytes[i] ^ testKey[i % testKey.length]);
}
console.log('Decoded with token XOR WHAT:', decoded.substring(0, 80));

// Try the reverse: key = WHAT XOR token
const testKey2 = whatBytes.map((w, i) => w ^ tokenBytes[i]);
let decoded2 = '';
for (let i = 0; i < encodedBytes.length; i++) {
  decoded2 += String.fromCharCode(encodedBytes[i] ^ testKey2[i % testKey2.length]);
}
console.log('Decoded with WHAT XOR token:', decoded2.substring(0, 80));

console.log('\n=== The actual key analysis ===');
// The actual key we derived from: encoded XOR URL = key
// Let's see if this key has any relationship to WHAT or token

// Check if actual key = f(WHAT, token)
console.log('\nChecking if key = f(WHAT, token):');
for (let i = 0; i < 32; i++) {
  const w = whatBytes[i];
  const t = tokenBytes[i];
  const k = actualKey[i];
  
  // Try various formulas
  const formulas = [
    { name: 'w XOR t', value: w ^ t },
    { name: 't XOR w', value: t ^ w },
    { name: 'w + t', value: (w + t) & 0xFF },
    { name: 'w - t', value: (w - t) & 0xFF },
    { name: 't - w', value: (t - w) & 0xFF },
    { name: 'w * t', value: (w * t) & 0xFF },
    { name: '(w + t) XOR i', value: ((w + t) ^ i) & 0xFF },
    { name: '(w XOR t) XOR i', value: ((w ^ t) ^ i) & 0xFF },
  ];
  
  for (const { name, value } of formulas) {
    if (value === k) {
      console.log(`  [${i}] key=${k} matches ${name}`);
    }
  }
}
