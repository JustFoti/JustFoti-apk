#!/usr/bin/env bun
/**
 * The response is parsed as protobuf.
 * Let's find the He object and understand the field structure.
 */

import { readFileSync } from 'fs';

const bundle = readFileSync('streamed-bundle-jw.js', 'utf-8');

// Search for He definition
console.log('=== Searching for He definition ===\n');

// He is likely defined as an object with field handlers
const heDefPatterns = [
  /const\s+He\s*=/,
  /let\s+He\s*=/,
  /var\s+He\s*=/,
  /He\s*=\s*\{/,
];

for (const pattern of heDefPatterns) {
  const match = bundle.match(pattern);
  if (match) {
    const idx = bundle.indexOf(match[0]);
    console.log(`Found He at index ${idx}:`);
    console.log(bundle.substring(idx, idx + 500));
    console.log('\n');
  }
}

// Search for where the decoded data is used after protobuf parsing
console.log('\n=== Searching for data usage after protobuf ===\n');

// After protobuf parsing: t.data contains the decoded data
// Let's find where this is used
const dataUsageMatch = bundle.match(/t\.data[\s\S]{0,500}/g);
if (dataUsageMatch) {
  console.log('Found t.data usage:');
  dataUsageMatch.slice(0, 5).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m.substring(0, 200));
  });
}

// Search for the callback function that receives the decoded data
console.log('\n\n=== Searching for callback handling ===\n');

// The nt() function calls n(t) with the decoded data
// Let's find where nt() is called and what callback is passed
const ntCallMatch = bundle.match(/nt\s*\([^)]*\)/g);
if (ntCallMatch) {
  console.log('Found nt() calls:', ntCallMatch.length);
  ntCallMatch.slice(0, 5).forEach(m => console.log(`  ${m.substring(0, 100)}`));
}

// Search for where the m3u8 URL is constructed
console.log('\n\n=== Searching for m3u8 URL construction ===\n');

// The URL format is: https://lb{N}.strmd.top/secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
// Let's find where this is built
const urlBuildMatch = bundle.match(/.{0,200}(lb|strmd|secure|stream).{0,200}/gi);
if (urlBuildMatch) {
  const relevant = urlBuildMatch.filter(m => 
    m.includes('lb') && (m.includes('strmd') || m.includes('secure') || m.includes('stream'))
  );
  console.log('Found URL construction patterns:');
  relevant.slice(0, 5).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Search for template literals that might construct the URL
console.log('\n\n=== Searching for template literals ===\n');

const templateMatch = bundle.match(/`[^`]*\$\{[^}]*\}[^`]*`/g);
if (templateMatch) {
  const urlTemplates = templateMatch.filter(m => 
    m.includes('http') || m.includes('lb') || m.includes('strmd') || m.includes('m3u8')
  );
  console.log('Found URL-related templates:');
  urlTemplates.slice(0, 10).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Search for the actual decode/decrypt function
console.log('\n\n=== Searching for decrypt/decode in obfuscated code ===\n');

// The obfuscated code uses patterns like vir8fbO[0x...] and L558JKk(...)
// Let's find XOR operations in this context
const obfuscatedXor = bundle.match(/\^[^;]{0,100}vir8fbO/g);
if (obfuscatedXor) {
  console.log('Found obfuscated XOR operations:', obfuscatedXor.length);
  obfuscatedXor.slice(0, 5).forEach(m => console.log(`  ${m.substring(0, 80)}`));
}

// Search for where the response body is processed
console.log('\n\n=== Searching for response body processing ===\n');

// The response might be decoded before protobuf parsing
const responseProcessing = bundle.match(/arrayBuffer\(\)[^}]*\.then[^}]*/g);
if (responseProcessing) {
  console.log('Found arrayBuffer processing:');
  responseProcessing.slice(0, 3).forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m.substring(0, 300));
  });
}

// Let's look at the Oe class (protobuf reader)
console.log('\n\n=== Searching for Oe class ===\n');

const oeClassMatch = bundle.match(/class\s+Oe[^{]*\{[\s\S]*?constructor[\s\S]*?\}/);
if (oeClassMatch) {
  console.log('Found Oe class:');
  console.log(oeClassMatch[0].substring(0, 1000));
}

// Alternative: search for Oe = 
const oeDefMatch = bundle.match(/Oe\s*=\s*class[^{]*\{[\s\S]*?constructor[\s\S]*?\}/);
if (oeDefMatch) {
  console.log('Found Oe definition:');
  console.log(oeDefMatch[0].substring(0, 1000));
}
