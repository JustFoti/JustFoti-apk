#!/usr/bin/env bun
/**
 * Found the XOR decode pattern:
 * for(let i=0;i<e.length;i++){const n=e.charCodeAt(i)^t.charCodeAt(i%r);s+=String.fromCharCode(n)}
 * 
 * Now let's find the context to understand what 't' and 'r' are
 */

import { readFileSync } from 'fs';

const bundle = readFileSync('streamed-bundle-jw.js', 'utf-8');

// Find the exact location of the XOR pattern
const xorPattern = 'for(let i=0;i<e.length;i++){const n=e.charCodeAt(i)^t.charCodeAt(i%r);s+=String.fromCharCode(n)}';
const xorIndex = bundle.indexOf(xorPattern);

if (xorIndex === -1) {
  console.log('Pattern not found, searching for variations...');
  
  // Try to find similar patterns
  const variations = [
    /for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\.length\s*;\s*\w+\+\+\s*\)\s*\{[^}]*charCodeAt[^}]*\^[^}]*charCodeAt[^}]*\}/g,
  ];
  
  for (const regex of variations) {
    const matches = bundle.match(regex);
    if (matches) {
      console.log(`Found ${matches.length} matches:`);
      matches.forEach((m, i) => {
        console.log(`\n[${i + 1}]`, m);
        
        // Find context
        const idx = bundle.indexOf(m);
        if (idx !== -1) {
          console.log('\nContext before:');
          console.log(bundle.substring(Math.max(0, idx - 500), idx));
          console.log('\nContext after:');
          console.log(bundle.substring(idx + m.length, idx + m.length + 500));
        }
      });
    }
  }
} else {
  console.log('Found XOR pattern at index:', xorIndex);
  
  // Get context
  const contextBefore = bundle.substring(Math.max(0, xorIndex - 1000), xorIndex);
  const contextAfter = bundle.substring(xorIndex + xorPattern.length, xorIndex + xorPattern.length + 500);
  
  console.log('\n=== Context Before ===');
  console.log(contextBefore);
  
  console.log('\n=== XOR Pattern ===');
  console.log(xorPattern);
  
  console.log('\n=== Context After ===');
  console.log(contextAfter);
}

// Also search for the function that contains this pattern
console.log('\n\n=== Searching for containing function ===');

// Find function definitions near the XOR pattern
const funcPattern = /(?:function\s+\w+|const\s+\w+\s*=\s*(?:function|\([^)]*\)\s*=>))[^{]*\{[^}]*charCodeAt[^}]*\^[^}]*charCodeAt[^}]*fromCharCode[^}]*\}/g;
const funcMatches = bundle.match(funcPattern);

if (funcMatches) {
  console.log(`Found ${funcMatches.length} function matches:`);
  funcMatches.forEach((m, i) => {
    console.log(`\n[${i + 1}]`, m);
  });
}

// Search for where the key comes from
console.log('\n\n=== Searching for key derivation ===');

// Look for patterns like: key = something.what or key = headers.get('what')
const keyPatterns = [
  /\w+\s*=\s*\w+\.what/gi,
  /\w+\s*=\s*\w+\.get\s*\(\s*['"]what['"]\s*\)/gi,
  /headers\.get\s*\(\s*['"]what['"]\s*\)/gi,
];

for (const regex of keyPatterns) {
  const matches = bundle.match(regex);
  if (matches) {
    console.log(`\nPattern ${regex}:`);
    matches.forEach(m => {
      console.log(`  ${m}`);
      // Get context
      const idx = bundle.indexOf(m);
      if (idx !== -1) {
        console.log('  Context:', bundle.substring(Math.max(0, idx - 100), idx + m.length + 100));
      }
    });
  }
}

// Look for the specific decode function
console.log('\n\n=== Looking for decode/decrypt functions ===');

// Search for function names that suggest decoding
const decodeFuncNames = bundle.match(/(?:decode|decrypt|decipher|xor)\w*\s*[=:]\s*(?:function|\([^)]*\)\s*=>)/gi);
if (decodeFuncNames) {
  console.log('Found decode-like function names:');
  decodeFuncNames.forEach(m => console.log(`  ${m}`));
}
