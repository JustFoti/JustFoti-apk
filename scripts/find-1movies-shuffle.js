// Find and execute the actual 1movies shuffle algorithm
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function findShuffle() {
  console.log('=== Finding 1movies Shuffle Algorithm ===\n');
  
  // Read the chunk
  let code;
  try {
    code = fs.readFileSync('1movies-860-chunk.js', 'utf8');
  } catch {
    const res = await fetch('https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js');
    code = await res.text();
    fs.writeFileSync('1movies-860-chunk.js', code);
  }
  
  // Find the shuffle IIFE - it's typically at the end of the chunk
  // Pattern: (function(arr, target) { while(true) { ... arr.push(arr.shift()) } })(arrayVar, number)
  
  console.log('Looking for shuffle IIFE...');
  
  // Look for the pattern with while(!![]
  const shuffleMatch = code.match(/\(\s*function\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{[^}]*while\s*\(\s*!!\s*\[\s*\]\s*\)\s*\{[^}]*parseInt[^}]*\}[^}]*\}\s*\)\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)/s);
  
  if (shuffleMatch) {
    console.log('Found shuffle IIFE!');
    console.log('Array param:', shuffleMatch[1]);
    console.log('Target param:', shuffleMatch[2]);
    console.log('Array var:', shuffleMatch[3]);
    console.log('Target value:', shuffleMatch[4]);
  }
  
  // Let's look for the parseInt calls in the shuffle
  console.log('\n=== Looking for parseInt pattern ===');
  
  // The shuffle typically has a checksum like:
  // parseInt(decode(338)) / 1 + parseInt(decode(344)) / 2 * ...
  
  const parseIntPattern = code.match(/parseInt\s*\(\s*\w+\s*\(\s*(\d+)\s*\)\s*\)\s*\/\s*(\d+)/g);
  if (parseIntPattern) {
    console.log('parseInt patterns found:', parseIntPattern.length);
    parseIntPattern.slice(0, 10).forEach(p => console.log('  ', p));
  }
  
  // Let's look at the actual shuffle function body
  console.log('\n=== Extracting shuffle function ===');
  
  // Find the while loop with the checksum
  const whileMatch = code.match(/while\s*\(\s*!!\s*\[\s*\]\s*\)\s*\{[^}]*try\s*\{([^}]+)\}[^}]*catch/s);
  if (whileMatch) {
    console.log('While loop body:');
    console.log(whileMatch[1].substring(0, 500));
  }
  
  // Let's try to find the exact checksum formula
  console.log('\n=== Finding checksum formula ===');
  
  // Look for the comparison with the target
  const checksumMatch = code.match(/===\s*(\w+)\s*\)\s*break/);
  if (checksumMatch) {
    console.log('Checksum comparison variable:', checksumMatch[1]);
  }
  
  // Let's look for the full expression
  const exprMatch = code.match(/([-+]?\s*parseInt\s*\([^)]+\)\s*\/\s*\d+\s*(?:\*\s*\([^)]+\)\s*)?(?:[-+]\s*parseInt\s*\([^)]+\)\s*\/\s*\d+\s*(?:\*\s*\([^)]+\)\s*)?)+)/);
  if (exprMatch) {
    console.log('Checksum expression:');
    console.log(exprMatch[1].substring(0, 800));
  }
  
  // Let's try a different approach - look at the structure around the array
  console.log('\n=== Looking at array context ===');
  
  // Find where the array is defined
  const arrayDefIndex = code.indexOf('t=["CMvWBgfJzq"');
  if (arrayDefIndex > 0) {
    console.log('Array definition context:');
    console.log(code.substring(arrayDefIndex - 100, arrayDefIndex + 200));
  }
  
  // Let's look for the e() function that returns the array
  console.log('\n=== Looking for e() function ===');
  
  const eFuncMatch = code.match(/function\s+e\s*\(\s*\)\s*\{([^}]+)\}/);
  if (eFuncMatch) {
    console.log('e() function body:', eFuncMatch[1].substring(0, 200));
  }
  
  // Let's look at the last 5000 chars of the chunk (where the IIFE usually is)
  console.log('\n=== Last part of chunk ===');
  console.log(code.substring(code.length - 3000));
}

findShuffle().catch(console.error);
