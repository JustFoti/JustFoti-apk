// Find the actual r() function in 1movies chunk
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function findRFunction() {
  console.log('=== Finding r() function ===\n');
  
  // Read the saved chunk
  let code;
  try {
    code = fs.readFileSync('1movies-860-chunk.js', 'utf8');
  } catch {
    const res = await fetch('https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js');
    code = await res.text();
    fs.writeFileSync('1movies-860-chunk.js', code);
  }
  
  // Find all function definitions
  console.log('Looking for function r...');
  
  // The r function is likely defined early in the code
  // Look for patterns like: function r(e,t){...}
  
  const funcPatterns = [
    /function\s+r\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{([^}]+)\}/g,
    /,r=function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{([^}]+)\}/g,
    /var\s+r\s*=\s*function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{([^}]+)\}/g,
  ];
  
  for (const pattern of funcPatterns) {
    const matches = code.matchAll(pattern);
    for (const m of matches) {
      console.log(`Found r(${m[1]}, ${m[2]}): ${m[3].substring(0, 200)}`);
    }
  }
  
  // Look for the array rotation/shuffle
  console.log('\n=== Looking for array manipulation ===');
  
  // Find where the array is shuffled
  const shuffleMatch = code.match(/\(\s*function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{[^}]*while[^}]*push[^}]*shift/);
  if (shuffleMatch) {
    console.log('Found shuffle function');
  }
  
  // Look for the specific pattern where r is defined
  console.log('\n=== Looking for r definition context ===');
  
  // Find "function r" and get surrounding context
  const rIndex = code.indexOf('function r(');
  if (rIndex > 0) {
    console.log('Context around function r:');
    console.log(code.substring(Math.max(0, rIndex - 200), rIndex + 300));
  }
  
  // Also look for where r is called in the hash construction
  console.log('\n=== Context where r is used in hash ===');
  const hashContext = code.match(/r\(392,-33\)[^;]{0,500}/);
  if (hashContext) {
    console.log(hashContext[0]);
  }
  
  // Let's look at the IIFE structure
  console.log('\n=== IIFE structure ===');
  
  // The obfuscator typically has:
  // (function(arr, offset) { ... })(theArray, someNumber)
  const iifeMatch = code.match(/\(\s*function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{[^}]*\}\s*\)\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)/);
  if (iifeMatch) {
    console.log(`IIFE: (function(${iifeMatch[1]}, ${iifeMatch[2]}) {...})(${iifeMatch[3]}, ${iifeMatch[4]})`);
  }
  
  // Look for the actual offset number
  console.log('\n=== Looking for offset numbers ===');
  const offsetMatches = code.matchAll(/(\d{3})\s*\)/g);
  const offsets = new Set();
  for (const m of offsetMatches) {
    const num = parseInt(m[1]);
    if (num >= 300 && num <= 900) {
      offsets.add(num);
    }
  }
  console.log('Potential offsets:', [...offsets].sort((a, b) => a - b));
  
  // Let's look at the actual structure more carefully
  console.log('\n=== Detailed analysis ===');
  
  // Find where the string array is defined and used
  const arrayDefMatch = code.match(/(\w+)\s*=\s*\[((?:"[^"]*",?\s*){50,})\]/);
  if (arrayDefMatch) {
    console.log('Array variable:', arrayDefMatch[1]);
    
    // Find where this variable is used
    const varName = arrayDefMatch[1];
    const usagePattern = new RegExp(`${varName}\\s*\\[([^\\]]+)\\]`, 'g');
    const usages = code.matchAll(usagePattern);
    console.log('Array usages:');
    let count = 0;
    for (const u of usages) {
      if (count++ < 10) {
        console.log(`  ${varName}[${u[1]}]`);
      }
    }
  }
  
  // Look for the decoder function that uses the array
  console.log('\n=== Looking for decoder pattern ===');
  
  // Common pattern: function(e, t) { return arr[e - offset] }
  const decoderMatch = code.match(/function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{\s*return\s+(\w+)\s*\[\s*\1\s*-\s*(\d+)\s*\]/);
  if (decoderMatch) {
    console.log(`Decoder: function(${decoderMatch[1]}, ${decoderMatch[2]}) { return ${decoderMatch[3]}[${decoderMatch[1]} - ${decoderMatch[4]}] }`);
  }
  
  // Alternative pattern with variable
  const decoderMatch2 = code.match(/(\w+)\s*=\s*function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{[^}]*(\w+)\s*\[\s*\2\s*-\s*(\d+)\s*\]/);
  if (decoderMatch2) {
    console.log(`Decoder ${decoderMatch2[1]}: uses array ${decoderMatch2[4]} with offset ${decoderMatch2[5]}`);
  }
}

findRFunction().catch(console.error);
