#!/usr/bin/env bun
/**
 * The it() function is for encoding headers, not decoding responses.
 * Let's search for where the /fetch response is decoded.
 */

import { readFileSync } from 'fs';

const bundle = readFileSync('streamed-bundle-jw.js', 'utf-8');

// Search for the fetch call to /fetch endpoint
console.log('=== Searching for /fetch endpoint handling ===\n');

// Look for the nt() function which handles fetch
const ntFuncMatch = bundle.match(/function\s+nt\s*\([^)]*\)\s*\{[\s\S]*?\}\s*function/);
if (ntFuncMatch) {
  console.log('Found nt() function:');
  console.log(ntFuncMatch[0].substring(0, 2000));
}

// Search for protobuf handling (Oe class)
console.log('\n\n=== Searching for protobuf handling ===\n');

const protobufMatch = bundle.match(/new\s+Oe\s*\([^)]*\)\.readFields/g);
if (protobufMatch) {
  console.log('Found protobuf readFields calls:', protobufMatch.length);
  protobufMatch.forEach(m => console.log(`  ${m}`));
}

// Search for where the decoded data is used
console.log('\n\n=== Searching for m3u8/playlist handling ===\n');

const m3u8Patterns = [
  /\.m3u8/gi,
  /playlist/gi,
  /hls/gi,
  /manifest/gi,
];

for (const pattern of m3u8Patterns) {
  const matches = bundle.match(pattern);
  if (matches) {
    console.log(`${pattern}: ${matches.length} matches`);
  }
}

// Search for URL construction
console.log('\n\n=== Searching for URL construction ===\n');

const urlPatterns = [
  /https?:\/\/[^"'\s]+/g,
  /lb\d*\.strmd/gi,
  /strmd\.top/gi,
];

for (const pattern of urlPatterns) {
  const matches = bundle.match(pattern);
  if (matches) {
    console.log(`${pattern}: ${matches.length} matches`);
    if (matches.length <= 10) {
      [...new Set(matches)].forEach(m => console.log(`  ${m}`));
    }
  }
}

// Search for the response handler that processes the encoded data
console.log('\n\n=== Searching for response data processing ===\n');

// Look for where t.data is used (from the protobuf response)
const dataProcessing = bundle.match(/\.data[\s\S]{0,200}(decode|decrypt|xor|charCodeAt)/gi);
if (dataProcessing) {
  console.log('Found data processing patterns:');
  dataProcessing.slice(0, 5).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Search for the He object which is used in readFields
console.log('\n\n=== Searching for He object (protobuf field handler) ===\n');

const heMatch = bundle.match(/He\s*=\s*\{[\s\S]*?\}/);
if (heMatch) {
  console.log('Found He object:');
  console.log(heMatch[0].substring(0, 1000));
}

// Search for where the WHAT header is used
console.log('\n\n=== Searching for WHAT header usage ===\n');

// The WHAT header might be used as a key somewhere
const whatUsage = bundle.match(/.{0,100}what.{0,100}/gi);
if (whatUsage) {
  console.log('Found WHAT references:');
  // Filter for relevant ones
  const relevant = whatUsage.filter(m => 
    m.toLowerCase().includes('header') || 
    m.toLowerCase().includes('key') ||
    m.toLowerCase().includes('decode') ||
    m.toLowerCase().includes('xor')
  );
  relevant.slice(0, 10).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Search for the actual decode function
console.log('\n\n=== Searching for decode patterns ===\n');

// Look for functions that take encoded data and a key
const decodeFuncs = bundle.match(/\(\s*\w+\s*,\s*\w+\s*\)\s*(?:=>|{)[^}]*charCodeAt[^}]*\^[^}]*/g);
if (decodeFuncs) {
  console.log('Found potential decode functions:');
  decodeFuncs.forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Look for the specific pattern where response is decoded
console.log('\n\n=== Searching for response decode chain ===\n');

// Pattern: fetch -> then -> decode
const fetchChain = bundle.match(/fetch\s*\([^)]*\)[^}]*\.then[^}]*\.then[^}]*/g);
if (fetchChain) {
  console.log('Found fetch chains:');
  fetchChain.slice(0, 3).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m.substring(0, 500));
  });
}
