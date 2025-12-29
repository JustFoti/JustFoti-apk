#!/usr/bin/env bun
/**
 * Let's try using jsdom to execute the JavaScript
 * This might work if the decoding doesn't require a full browser
 */

// First, let's fetch the bundle and try to extract the decode function
import { readFileSync } from 'fs';

const bundle = readFileSync('streamed-bundle-jw.js', 'utf-8');

// Search for the specific decode function
// We found earlier that there's XOR in a loop: for(let i=0;i<e.length;i++){const n=e.charCodeAt(i)^t.charCodeAt(i%r);s+=String.fromCharCode(n)}

// Let's find ALL XOR operations and their context
console.log('=== Finding all XOR decode patterns ===\n');

// Pattern: charCodeAt...^...charCodeAt
const xorPatterns = bundle.match(/charCodeAt\s*\([^)]*\)\s*\^\s*[^;]+charCodeAt\s*\([^)]*\)/g);
if (xorPatterns) {
  console.log(`Found ${xorPatterns.length} XOR patterns:`);
  [...new Set(xorPatterns)].forEach((p, i) => {
    console.log(`\n[${i + 1}]`, p);
    
    // Get context
    const idx = bundle.indexOf(p);
    if (idx !== -1) {
      const contextStart = Math.max(0, idx - 200);
      const contextEnd = Math.min(bundle.length, idx + p.length + 200);
      console.log('Context:', bundle.substring(contextStart, contextEnd));
    }
  });
}

// Let's also search for where the /fetch response is processed
console.log('\n\n=== Searching for /fetch response processing ===\n');

// The response is processed in the nt() function
// After protobuf parsing, the data is passed to a callback
// Let's find where this callback processes the data

// Search for patterns like: function(t) { ... t.data ... }
const callbackPatterns = bundle.match(/function\s*\(\s*\w+\s*\)\s*\{[^}]*\.data[^}]*\}/g);
if (callbackPatterns) {
  console.log(`Found ${callbackPatterns.length} callback patterns with .data`);
  
  // Filter for ones that might be processing the response
  const relevant = callbackPatterns.filter(p => 
    p.includes('url') || p.includes('src') || p.includes('file') || p.includes('stream')
  );
  
  console.log(`Relevant patterns: ${relevant.length}`);
  relevant.slice(0, 5).forEach((p, i) => {
    console.log(`\n[${i + 1}]`, p);
  });
}

// Let's search for where the m3u8 URL is set
console.log('\n\n=== Searching for m3u8 URL assignment ===\n');

// The URL might be assigned to a property like .src, .file, .url
const urlAssignPatterns = [
  /\.src\s*=\s*[^;]+/g,
  /\.file\s*=\s*[^;]+/g,
  /\.url\s*=\s*[^;]+/g,
  /source\s*:\s*[^,}]+/g,
];

for (const pattern of urlAssignPatterns) {
  const matches = bundle.match(pattern);
  if (matches) {
    // Filter for ones that might be m3u8 URLs
    const relevant = matches.filter(m => 
      m.includes('http') || m.includes('data') || m.includes('response')
    );
    if (relevant.length > 0) {
      console.log(`${pattern}: ${relevant.length} relevant matches`);
      relevant.slice(0, 3).forEach(m => console.log(`  ${m.substring(0, 100)}`));
    }
  }
}

// Let's try to find the actual decode function by searching for the pattern
// where encoded data is transformed into a URL
console.log('\n\n=== Searching for URL transformation ===\n');

// The transformation might look like: url = decode(data, key) or url = data.map(...)
const transformPatterns = [
  /=\s*[^;]*decode[^;]*/gi,
  /=\s*[^;]*decrypt[^;]*/gi,
  /=\s*[^;]*\.map\s*\([^)]*charCodeAt[^)]*\)/g,
];

for (const pattern of transformPatterns) {
  const matches = bundle.match(pattern);
  if (matches) {
    console.log(`${pattern}: ${matches.length} matches`);
    matches.slice(0, 5).forEach(m => console.log(`  ${m.substring(0, 100)}`));
  }
}

// Let's look at the obfuscated code more carefully
// The vir8fbO array contains constants used in the obfuscated code
console.log('\n\n=== Analyzing obfuscated constants ===\n');

// Extract the vir8fbO array
const vir8fbOMatch = bundle.match(/vir8fbO\s*=\s*\[([\s\S]*?)\]/);
if (vir8fbOMatch) {
  const arrayContent = vir8fbOMatch[1];
  
  // Parse the array elements
  const elements = arrayContent.split(',').map(e => e.trim());
  console.log(`vir8fbO has ${elements.length} elements`);
  
  // Look for string elements that might be function names
  const stringElements = elements.filter(e => e.startsWith('"') || e.startsWith("'") || e.startsWith('\\'));
  console.log(`String elements: ${stringElements.length}`);
  stringElements.slice(0, 20).forEach((e, i) => {
    // Try to decode the string
    try {
      const decoded = JSON.parse(`"${e.replace(/^["']|["']$/g, '')}"`);
      console.log(`  [${i}]: ${decoded}`);
    } catch {
      console.log(`  [${i}]: ${e}`);
    }
  });
}
