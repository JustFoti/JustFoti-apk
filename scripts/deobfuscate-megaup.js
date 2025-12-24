#!/usr/bin/env node
/**
 * Deobfuscate and analyze MegaUp app.js
 */

const fs = require('fs');
const js = fs.readFileSync('megaup-app.js', 'utf8');

console.log('JS length:', js.length);

// Find all function definitions
const funcDefs = js.match(/function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)/g);
console.log('\nFunction definitions:', funcDefs?.length || 0);

// Look for the player setup - this is where decryption happens
const setupPatterns = [
  /jwplayer\s*\(/gi,
  /\.setup\s*\(/gi,
  /player\s*\./gi,
  /sources\s*:/gi,
];

console.log('\n=== Looking for player setup ===');
for (const pattern of setupPatterns) {
  const matches = js.match(pattern);
  if (matches) {
    console.log(`${pattern.source}: ${matches.length} matches`);
    // Find context around first match
    const idx = js.search(pattern);
    if (idx >= 0) {
      console.log('  Context:', js.substring(Math.max(0, idx - 30), idx + 100).replace(/\n/g, ' '));
    }
  }
}

// Look for the __PAGE_DATA processing
console.log('\n=== Looking for data processing ===');
const dataPatterns = [
  /__PAGE_DATA/gi,
  /window\./gi,
  /JSON\.parse/gi,
  /atob/gi,
  /btoa/gi,
  /decodeURI/gi,
  /encodeURI/gi,
];

for (const pattern of dataPatterns) {
  const idx = js.search(pattern);
  if (idx >= 0) {
    console.log(`${pattern.source} at ${idx}:`);
    console.log('  ', js.substring(Math.max(0, idx - 20), idx + 80).replace(/\n/g, ' '));
  }
}

// Look for crypto-related operations
console.log('\n=== Looking for crypto operations ===');
const cryptoPatterns = [
  /charCodeAt/gi,
  /fromCharCode/gi,
  /split\s*\(\s*['"]['"]?\s*\)/gi,
  /join\s*\(\s*['"]['"]?\s*\)/gi,
  /reverse\s*\(\s*\)/gi,
  /substring/gi,
  /substr/gi,
  /slice/gi,
  /charAt/gi,
];

for (const pattern of cryptoPatterns) {
  const matches = js.match(pattern);
  if (matches) {
    console.log(`${pattern.source}: ${matches.length} matches`);
  }
}

// Look for XOR operations
console.log('\n=== Looking for XOR operations ===');
const xorMatches = js.match(/\^/g);
console.log('XOR operators (^):', xorMatches?.length || 0);

// Find XOR in context
let xorIdx = 0;
let xorCount = 0;
while ((xorIdx = js.indexOf('^', xorIdx + 1)) !== -1 && xorCount < 5) {
  // Check if it's actually XOR (not in a regex or string)
  const before = js.substring(Math.max(0, xorIdx - 30), xorIdx);
  const after = js.substring(xorIdx, xorIdx + 30);
  if (!before.includes('/') && !before.includes('"') && !before.includes("'")) {
    console.log(`XOR at ${xorIdx}: ...${before}^${after}...`);
    xorCount++;
  }
}

// Look for base64 alphabet or custom encoding
console.log('\n=== Looking for encoding alphabets ===');
const alphabetMatch = js.match(/['"]([-A-Za-z0-9+/_=]{60,})['"]/);
if (alphabetMatch) {
  console.log('Possible alphabet:', alphabetMatch[1].substring(0, 80));
}

// Look for array of numbers (S-box, lookup table)
console.log('\n=== Looking for lookup tables ===');
const arrayMatch = js.match(/\[\s*(\d+\s*,\s*){10,}\d+\s*\]/);
if (arrayMatch) {
  console.log('Number array found:', arrayMatch[0].substring(0, 100));
}

// Extract all string literals longer than 20 chars
console.log('\n=== Long string literals ===');
const stringLiterals = js.match(/["'][^"']{20,}["']/g);
if (stringLiterals) {
  const unique = [...new Set(stringLiterals)].slice(0, 10);
  unique.forEach(s => console.log('  ', s.substring(0, 60)));
}
