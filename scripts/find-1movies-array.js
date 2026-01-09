// Find the correct string array in 1movies
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function findArray() {
  console.log('Finding 1movies string array...\n');
  
  // Fetch the 860 chunk
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const res = await fetch(chunkUrl);
  const js = await res.text();
  
  console.log('Chunk size:', js.length, 'bytes');
  
  // The obfuscator typically uses a pattern like:
  // var a = ["str1", "str2", ...];
  // function e() { return a; }
  // function r(e, t) { var n = a(); return r = function(e, t) { return n[e - offset]; }, r(e, t); }
  
  // Let's find ALL arrays in the code
  console.log('\n=== Finding all arrays ===');
  
  const arrayPattern = /\[(?:"[^"]*",?\s*){10,}\]/g;
  const arrays = js.match(arrayPattern) || [];
  
  console.log('Found', arrays.length, 'arrays');
  
  for (let i = 0; i < arrays.length; i++) {
    const arr = arrays[i];
    const strings = arr.match(/"[^"]+"/g) || [];
    console.log(`\nArray ${i}: ${strings.length} strings`);
    if (strings.length > 100) {
      console.log('  First 10:', strings.slice(0, 10).map(s => s.substring(0, 20)));
      console.log('  Last 10:', strings.slice(-10).map(s => s.substring(0, 20)));
    }
  }
  
  // Let's also look for the function that returns the array
  console.log('\n=== Looking for array function ===');
  
  // Pattern: function name() { return array }
  const funcPattern = /function\s+(\w+)\s*\(\)\s*\{\s*return\s+(\w+)\s*;?\s*\}/g;
  let match;
  while ((match = funcPattern.exec(js)) !== null) {
    console.log(`Function ${match[1]} returns ${match[2]}`);
  }
  
  // Let's look for the r function definition
  console.log('\n=== Looking for r function ===');
  
  // Find "function r"
  const rIdx = js.indexOf('function r(');
  if (rIdx > -1) {
    const rContext = js.substring(rIdx, rIdx + 500);
    console.log('r function context:', rContext.substring(0, 300));
  }
  
  // Let's try a different approach - look for the offset in the r function
  console.log('\n=== Looking for offset patterns ===');
  
  // Pattern: e - NUMBER or n - NUMBER
  const offsetPatterns = js.match(/\w+\s*-\s*(\d{2,})/g) || [];
  const uniqueOffsets = [...new Set(offsetPatterns.map(p => {
    const m = p.match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }))].filter(n => n > 100 && n < 1000);
  
  console.log('Potential offsets:', uniqueOffsets);
  
  // Let's try to find the actual decoder by looking at how r is called
  console.log('\n=== Analyzing r() calls ===');
  
  // The calls we know: r(392,-33), r(409,-34), etc.
  // If offset is 338, then r(392,-33) would be index 54
  // If offset is 9, then r(392,-33) would be index 383
  
  // Let's find the largest array and use that
  let largestArray = [];
  for (const arr of arrays) {
    const strings = [];
    const regex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
    let m;
    while ((m = regex.exec(arr)) !== null) {
      strings.push(m[1]);
    }
    if (strings.length > largestArray.length) {
      largestArray = strings;
    }
  }
  
  console.log('\nLargest array has', largestArray.length, 'strings');
  
  // Try different offsets
  console.log('\n=== Trying different offsets ===');
  
  for (const offset of [338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350]) {
    const idx = 392 - offset;
    if (idx >= 0 && idx < largestArray.length) {
      console.log(`Offset ${offset}: r(392,-33) = [${idx}] = "${largestArray[idx]}"`);
    }
  }
  
  // Let's also check if there's a second chunk with more strings
  console.log('\n=== Checking other chunks ===');
  
  // Get the page to find all chunks
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await pageRes.text();
  
  const chunkMatches = html.match(/_next\/static\/chunks\/[^"']+\.js/g) || [];
  
  for (const chunk of chunkMatches) {
    if (chunk.includes('860')) continue; // Skip the one we already checked
    
    const chunkUrl = `${BASE_URL}/${chunk}`;
    try {
      const chunkRes = await fetch(chunkUrl);
      const chunkJs = await chunkRes.text();
      
      // Look for large arrays
      const chunkArrays = chunkJs.match(/\[(?:"[^"]*",?\s*){50,}\]/g) || [];
      if (chunkArrays.length > 0) {
        for (const arr of chunkArrays) {
          const strings = arr.match(/"[^"]+"/g) || [];
          if (strings.length > 100) {
            console.log(`${chunk}: Found array with ${strings.length} strings`);
          }
        }
      }
    } catch (e) {
      // Skip
    }
  }
}

findArray().catch(console.error);
