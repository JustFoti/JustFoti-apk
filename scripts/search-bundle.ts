#!/usr/bin/env bun
/**
 * Search the bundle for decoding-related code
 */

import { readFileSync } from 'fs';

const bundle = readFileSync('streamed-bundle-jw.js', 'utf-8');

console.log('Bundle size:', bundle.length);

// Search for patterns
const patterns = [
  { name: 'charCodeAt', regex: /\.charCodeAt\s*\([^)]*\)/g },
  { name: 'fromCharCode', regex: /String\.fromCharCode/g },
  { name: 'what header', regex: /\.what|"what"|'what'/gi },
  { name: 'fetch /fetch', regex: /fetch[^}]*\/fetch/gi },
  { name: 'XOR operations', regex: /\w+\s*\^\s*\w+/g },
  { name: 'strmd.top', regex: /strmd\.top/gi },
  { name: 'playlist.m3u8', regex: /playlist\.m3u8/gi },
  { name: 'secure', regex: /\/secure\//gi },
  { name: 'decode function', regex: /decode\s*[=:]\s*function/gi },
  { name: 'encrypt/decrypt', regex: /encrypt|decrypt/gi },
];

for (const { name, regex } of patterns) {
  const matches = bundle.match(regex);
  console.log(`\n${name}: ${matches?.length || 0} matches`);
  if (matches && matches.length <= 10) {
    matches.forEach(m => console.log(`  ${m.substring(0, 80)}`));
  }
}

// Look for the specific decoding logic
// Search for code that handles the /fetch response
console.log('\n\n=== Searching for fetch handler ===');

// Find all occurrences of "fetch" and get context
const fetchMatches = [...bundle.matchAll(/fetch\s*\([^)]*\)/g)];
console.log(`Found ${fetchMatches.length} fetch calls`);

// Look for the one that calls /fetch endpoint
const fetchFetchMatch = bundle.match(/.{0,500}\/fetch.{0,500}/);
if (fetchFetchMatch) {
  console.log('\nContext around /fetch:');
  console.log(fetchFetchMatch[0]);
}

// Look for response handling with headers
const headersMatch = bundle.match(/.{0,300}headers\.get.{0,300}/gi);
if (headersMatch) {
  console.log('\n\n=== Headers.get usage ===');
  headersMatch.slice(0, 5).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Look for XOR in a loop context
const xorLoopMatch = bundle.match(/for\s*\([^)]*\)[^{]*\{[^}]*\^[^}]*\}/g);
if (xorLoopMatch) {
  console.log('\n\n=== XOR in loops ===');
  xorLoopMatch.slice(0, 10).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Look for the specific pattern: something like result += String.fromCharCode(data[i] ^ key[i])
const decodePatternMatch = bundle.match(/String\.fromCharCode[^;]*\^[^;]*/g);
if (decodePatternMatch) {
  console.log('\n\n=== fromCharCode with XOR ===');
  decodePatternMatch.slice(0, 10).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Search for any function that looks like a decoder
// Pattern: function that takes two parameters and uses XOR
const decoderFuncMatch = bundle.match(/\(\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\{[^}]*\^[^}]*\}/g);
if (decoderFuncMatch) {
  console.log('\n\n=== Arrow functions with XOR ===');
  decoderFuncMatch.slice(0, 10).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Look for the lb*.strmd.top URL construction
const lbMatch = bundle.match(/.{0,200}lb.{0,200}strmd/gi);
if (lbMatch) {
  console.log('\n\n=== lb...strmd pattern ===');
  lbMatch.slice(0, 5).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}
