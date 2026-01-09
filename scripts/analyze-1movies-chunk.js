// Analyze the 1movies 860 chunk structure
require('dotenv').config({ path: '.env.local' });

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

async function analyze() {
  console.log('=== Analyzing 1movies 860 Chunk ===\n');
  
  const chunkUrl = 'https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js';
  const res = await fetch(chunkUrl, { headers: HEADERS });
  const code = await res.text();
  
  console.log('Chunk size:', code.length);
  
  // Save the chunk for manual inspection
  require('fs').writeFileSync('1movies-860-chunk.js', code);
  console.log('Saved to 1movies-860-chunk.js');
  
  // Find all array definitions
  console.log('\n1. Looking for array definitions...');
  const arrayMatches = code.matchAll(/(\w+)\s*=\s*\[("[^"]*"(?:,\s*"[^"]*")*)\]/g);
  for (const m of arrayMatches) {
    const strings = m[2].match(/"[^"]*"/g);
    if (strings && strings.length > 10) {
      console.log(`   ${m[1]}: ${strings.length} strings`);
      console.log(`   First 3: ${strings.slice(0, 3).join(', ')}`);
    }
  }
  
  // Find function definitions
  console.log('\n2. Looking for decoder functions...');
  const funcMatches = code.matchAll(/function\s+(\w)\s*\([^)]*\)\s*\{[^}]{10,200}\}/g);
  for (const m of funcMatches) {
    console.log(`   function ${m[1]}: ${m[0].substring(0, 150)}...`);
  }
  
  // Find the hash construction more precisely
  console.log('\n3. Finding hash construction...');
  
  // Look for the fetch URL pattern
  const fetchPattern = code.match(/fetch\s*\(\s*["'`]\/["'`]\s*\+\s*([^,]+)/);
  if (fetchPattern) {
    console.log('   Fetch URL construction:', fetchPattern[1].substring(0, 300));
  }
  
  // Find the part that builds the URL ending with /ar
  const arPattern = code.match(/([^=]{200,800}913b00773\/ar)/);
  if (arPattern) {
    console.log('\n4. Full hash construction:');
    console.log(arPattern[1]);
  }
  
  // Extract all the r() and t() calls from the hash construction
  console.log('\n5. Extracting all function calls from hash...');
  if (arPattern) {
    const hashPart = arPattern[1];
    
    // Extract r() calls
    const rCalls = hashPart.matchAll(/r\((\d+),\s*(-?\d+)\)/g);
    console.log('   r() calls:');
    for (const m of rCalls) {
      console.log(`     r(${m[1]}, ${m[2]})`);
    }
    
    // Extract t() calls
    const tCalls = hashPart.matchAll(/t\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/g);
    console.log('   t() calls:');
    for (const m of tCalls) {
      console.log(`     t(${m[1]}, ${m[2]}, ${m[3]}, ${m[4]})`);
    }
    
    // Extract literal strings
    const literals = hashPart.matchAll(/"([^"]+)"/g);
    console.log('   Literal strings:');
    for (const m of literals) {
      console.log(`     "${m[1]}"`);
    }
  }
  
  // Find the IIFE that contains the string array
  console.log('\n6. Looking for IIFE with string array...');
  const iifeMatch = code.match(/\(function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{[^}]*\}\s*\)\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)/);
  if (iifeMatch) {
    console.log('   IIFE found:', iifeMatch[0].substring(0, 200));
  }
  
  // Look for the array shuffle/rotation
  console.log('\n7. Looking for array rotation...');
  const rotateMatch = code.match(/while\s*\(\s*!!\s*\[\s*\]\s*\)\s*\{[^}]*push\s*\([^)]*shift\s*\(\s*\)\s*\)/);
  if (rotateMatch) {
    console.log('   Rotation found:', rotateMatch[0].substring(0, 200));
  }
  
  // Let's look at the beginning of the chunk
  console.log('\n8. First 2000 chars of chunk:');
  console.log(code.substring(0, 2000));
}

analyze().catch(console.error);
