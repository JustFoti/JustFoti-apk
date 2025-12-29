#!/usr/bin/env bun
/**
 * Let's find the He object and understand the protobuf field structure.
 * Also search for where the actual m3u8 URL is constructed.
 */

import { readFileSync } from 'fs';

const bundle = readFileSync('streamed-bundle-jw.js', 'utf-8');

// Search for He = { with field handlers
console.log('=== Searching for He object definition ===\n');

// He is used in readFields(He, {ret:0}, undefined)
// It should be an object with numeric keys (field numbers)
const heSearchPatterns = [
  /He\s*=\s*\{[^}]*1\s*:/,
  /He\s*=\s*\{[^}]*\d+\s*:/,
  /const\s+He\s*=\s*\{/,
];

for (const pattern of heSearchPatterns) {
  const match = bundle.match(pattern);
  if (match) {
    const idx = bundle.indexOf(match[0]);
    console.log(`Found He at index ${idx}:`);
    // Get more context
    let depth = 0;
    let end = idx;
    for (let i = idx; i < bundle.length && i < idx + 2000; i++) {
      if (bundle[i] === '{') depth++;
      if (bundle[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    console.log(bundle.substring(idx, end));
    console.log('\n');
    break;
  }
}

// Search for where the protobuf response is used
console.log('\n=== Searching for protobuf response usage ===\n');

// After parsing: t.data contains the field data
// The code does: const s=t[t.data]; delete t[t.data]; t.data=s;
// This means t.data is a field name, and the actual data is in t[fieldName]

// Let's find where this data is used
const afterProtobuf = bundle.match(/t\.data\s*=\s*s[\s\S]{0,500}/g);
if (afterProtobuf) {
  console.log('Found post-protobuf processing:');
  afterProtobuf.slice(0, 3).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m.substring(0, 300));
  });
}

// Search for the callback that receives the decoded data
console.log('\n\n=== Searching for data callback ===\n');

// The nt() function is called with callbacks
// Let's find where nt() is called with the /fetch URL
const ntWithFetch = bundle.match(/.{0,200}nt\s*\([^)]*fetch[^)]*\)/gi);
if (ntWithFetch) {
  console.log('Found nt() calls with fetch:');
  ntWithFetch.forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Search for where the URL is built from the response
console.log('\n\n=== Searching for URL building from response ===\n');

// The response data should be used to build the m3u8 URL
// Let's find string concatenation or template literals that build URLs
const urlBuildPatterns = [
  /\+\s*["']\/stream\//g,
  /\+\s*["']\/secure\//g,
  /\+\s*["']\.m3u8["']/g,
  /\+\s*["']playlist\.m3u8["']/g,
];

for (const pattern of urlBuildPatterns) {
  const matches = bundle.match(pattern);
  if (matches) {
    console.log(`${pattern}: ${matches.length} matches`);
    matches.forEach(m => {
      const idx = bundle.indexOf(m);
      console.log(`  Context: ${bundle.substring(Math.max(0, idx - 100), idx + m.length + 100)}`);
    });
  }
}

// Search for the actual stream URL construction
console.log('\n\n=== Searching for stream URL patterns ===\n');

// The URL might be constructed using variables
// Let's search for patterns like: baseUrl + token + source + ...
const streamUrlPatterns = [
  /["']https:\/\/lb/g,
  /["']\.strmd\.top/g,
  /["']\/secure\//g,
];

for (const pattern of streamUrlPatterns) {
  const matches = bundle.match(pattern);
  if (matches) {
    console.log(`${pattern}: ${matches.length} matches`);
  }
}

// The URL might be entirely in the response data
// Let's check if the response is just the URL (possibly encoded)
console.log('\n\n=== Checking if response is the URL ===\n');

// If the response is the URL, it would be used directly
// Let's find where a string from the response is used as a URL
const urlUsagePatterns = [
  /\.data[^;]*\.src\s*=/g,
  /\.data[^;]*\.file\s*=/g,
  /\.data[^;]*url/gi,
];

for (const pattern of urlUsagePatterns) {
  const matches = bundle.match(pattern);
  if (matches) {
    console.log(`${pattern}: ${matches.length} matches`);
    matches.slice(0, 5).forEach(m => console.log(`  ${m}`));
  }
}

// Search for where the response is decoded/decrypted
console.log('\n\n=== Searching for response decoding ===\n');

// The response might be decoded before being used
// Let's find decode/decrypt operations on the response
const decodePatterns = [
  /\.data[^;]*decode/gi,
  /\.data[^;]*decrypt/gi,
  /\.data[^;]*xor/gi,
  /decode[^;]*\.data/gi,
];

for (const pattern of decodePatterns) {
  const matches = bundle.match(pattern);
  if (matches) {
    console.log(`${pattern}: ${matches.length} matches`);
    matches.slice(0, 5).forEach(m => console.log(`  ${m}`));
  }
}

// Let's look at the obfuscated code more carefully
console.log('\n\n=== Analyzing obfuscated code ===\n');

// The obfuscated code uses L558JKk() to decode strings
// Let's find the L558JKk function
const l558Match = bundle.match(/L558JKk\s*=\s*function[^{]*\{[\s\S]*?\}/);
if (l558Match) {
  console.log('Found L558JKk function:');
  console.log(l558Match[0].substring(0, 500));
}

// Also find vir8fbO array
const vir8fbOMatch = bundle.match(/vir8fbO\s*=\s*\[[^\]]*\]/);
if (vir8fbOMatch) {
  console.log('\nFound vir8fbO array (first 500 chars):');
  console.log(vir8fbOMatch[0].substring(0, 500));
}
