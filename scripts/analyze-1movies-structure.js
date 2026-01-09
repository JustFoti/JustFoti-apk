// Analyze the full structure of 1movies 860 chunk
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function analyze() {
  console.log('=== Analyzing 1movies 860 Structure ===\n');
  
  // Read the chunk
  let code;
  try {
    code = fs.readFileSync('1movies-860-chunk.js', 'utf8');
  } catch {
    const res = await fetch('https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js');
    code = await res.text();
    fs.writeFileSync('1movies-860-chunk.js', code);
  }
  
  // Find the e() function that returns the array
  console.log('=== e() function ===');
  const eFuncStart = code.indexOf('function e(){');
  if (eFuncStart > 0) {
    // Find the end of the function
    let braceCount = 0;
    let funcEnd = eFuncStart;
    let inFunc = false;
    
    for (let i = eFuncStart; i < code.length; i++) {
      if (code[i] === '{') {
        braceCount++;
        inFunc = true;
      } else if (code[i] === '}') {
        braceCount--;
        if (inFunc && braceCount === 0) {
          funcEnd = i + 1;
          break;
        }
      }
    }
    
    const eFunc = code.substring(eFuncStart, funcEnd);
    console.log('e() function:');
    console.log(eFunc.substring(0, 2000));
    
    // Check if there's a shuffle inside e()
    if (eFunc.includes('push') && eFunc.includes('shift')) {
      console.log('\n*** e() contains push/shift (shuffle) ***');
    }
  }
  
  // Find the r() function
  console.log('\n=== r() function ===');
  const rFuncMatch = code.match(/function\s+r\s*\(\s*\w+\s*,\s*\w+\s*\)\s*\{[^}]+return[^}]+\}/);
  if (rFuncMatch) {
    console.log('r() function:', rFuncMatch[0]);
  }
  
  // Look for the actual decoder logic
  console.log('\n=== Looking for decoder with base64 ===');
  const base64Match = code.match(/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\+\/=/);
  if (base64Match) {
    const idx = code.indexOf(base64Match[0]);
    console.log('Base64 alphabet context:');
    console.log(code.substring(Math.max(0, idx - 200), idx + 100));
  }
  
  // Let's look for the actual hash construction more carefully
  console.log('\n=== Hash construction context ===');
  const hashIdx = code.indexOf('913b00773/ar');
  if (hashIdx > 0) {
    // Find the start of the expression (look for = or ,)
    let start = hashIdx;
    let parenCount = 0;
    for (let i = hashIdx; i >= 0; i--) {
      if (code[i] === ')') parenCount++;
      if (code[i] === '(') parenCount--;
      if ((code[i] === '=' || code[i] === ',') && parenCount === 0) {
        start = i + 1;
        break;
      }
    }
    
    const hashExpr = code.substring(start, hashIdx + 20);
    console.log('Hash expression:');
    console.log(hashExpr);
  }
  
  // Let's try to execute the decoder in a sandbox
  console.log('\n=== Trying to execute decoder ===');
  
  // Extract the array
  const arrayMatch = code.match(/let\s+t\s*=\s*\[((?:"[^"]*",?\s*)+)\]/);
  if (arrayMatch) {
    const strings = arrayMatch[1].match(/"([^"]*)"/g).map(s => s.slice(1, -1));
    console.log('Array length:', strings.length);
    
    // The e() function returns the array, but it might be shuffled first
    // Let's look for the shuffle logic
    
    // The shuffle is typically: while(true) { if (checksum === target) break; arr.push(arr.shift()); }
    // The checksum is calculated from parseInt of decoded strings
    
    // Let's find the checksum formula
    const checksumMatch = code.match(/(-?\s*parseInt\s*\(\s*\w+\s*\(\s*\d+\s*\)\s*\)\s*\/\s*\d+[^=]+)===\s*\w+/);
    if (checksumMatch) {
      console.log('Checksum formula:', checksumMatch[1].substring(0, 500));
    }
    
    // Let's look for the target value
    const targetMatch = code.match(/\)\s*\(\s*e\s*,\s*(\d+)\s*\)/);
    if (targetMatch) {
      console.log('Target value:', targetMatch[1]);
    }
  }
  
  // Let's look at the first 5000 chars
  console.log('\n=== First 5000 chars ===');
  console.log(code.substring(0, 5000));
}

analyze().catch(console.error);
