// Fetch and analyze the f59d6 decoder script
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function fetchDecoder() {
  console.log('Fetching f59d6 decoder script...\n');
  
  const url = 'https://cloudnestra.com/f59d610a61063c7ef3ccdc1fd40d2ae6.js';
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://cloudnestra.com/'
    }
  });
  
  const js = await res.text();
  console.log('Size:', js.length, 'bytes');
  
  // Save it
  fs.writeFileSync('vidsrc-f59d6-decoder.js', js);
  console.log('Saved to vidsrc-f59d6-decoder.js\n');
  
  // Check if it's obfuscated
  if (js.includes('_0x') || js.includes('eval(')) {
    console.log('⚠️ Script is obfuscated\n');
  }
  
  // Look for key patterns
  console.log('=== Key patterns ===');
  
  // getElementById
  const getElem = js.match(/getElementById\s*\([^)]+\)/g) || [];
  console.log('getElementById:', getElem.slice(0, 5));
  
  // innerHTML
  const innerHTML = js.match(/\.innerHTML/g) || [];
  console.log('innerHTML:', innerHTML.length);
  
  // charCodeAt
  const charCode = js.match(/charCodeAt/g) || [];
  console.log('charCodeAt:', charCode.length);
  
  // fromCharCode
  const fromChar = js.match(/fromCharCode/g) || [];
  console.log('fromCharCode:', fromChar.length);
  
  // parseInt with 16
  const parseInt16 = js.match(/parseInt\s*\([^,]+,\s*16\s*\)/g) || [];
  console.log('parseInt(x, 16):', parseInt16.length);
  
  // XOR
  const xor = js.match(/\^\s*\d+/g) || [];
  console.log('XOR:', [...new Set(xor)].slice(0, 20));
  
  // Look for the decode function
  console.log('\n=== Looking for decode function ===');
  
  // Find functions that use getElementById and charCodeAt
  const funcPattern = /function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*getElementById[^}]*\}/g;
  let match;
  while ((match = funcPattern.exec(js)) !== null) {
    console.log('Function with getElementById:', match[1]);
    console.log('  ', match[0].substring(0, 200));
  }
  
  // Look for the file assignment
  console.log('\n=== Looking for file assignment ===');
  
  const fileAssign = js.match(/file\s*[=:]\s*[^,;\n]+/gi) || [];
  console.log('file assignments:', fileAssign.slice(0, 10));
  
  // Look for the actual decode logic
  console.log('\n=== Looking for decode logic ===');
  
  // The content is hex, so look for hex processing
  // Pattern: loop through string, take 2 chars, parseInt as hex
  
  const loopPattern = js.match(/for\s*\([^)]+\)\s*\{[^}]*parseInt[^}]*\}/g) || [];
  console.log('Loops with parseInt:', loopPattern.length);
  if (loopPattern.length > 0) {
    console.log('First loop:', loopPattern[0]);
  }
  
  // Look for the key used in XOR
  console.log('\n=== Looking for XOR key ===');
  
  // The key might be a string or number
  const keyPatterns = js.match(/key\s*[=:]\s*["'][^"']+["']/gi) || [];
  console.log('key assignments:', keyPatterns.slice(0, 10));
  
  // Look for the specific decode that handles the div content
  console.log('\n=== Searching for div content handler ===');
  
  // Find where innerHTML is read and processed
  const innerHtmlRead = js.match(/\w+\s*=\s*[^;]*\.innerHTML[^;]*/g) || [];
  console.log('innerHTML reads:', innerHtmlRead.slice(0, 5));
  
  // Look for the context around innerHTML
  const innerHtmlIdx = js.indexOf('.innerHTML');
  if (innerHtmlIdx > -1) {
    console.log('\nContext around innerHTML:');
    console.log(js.substring(Math.max(0, innerHtmlIdx - 300), innerHtmlIdx + 200));
  }
  
  // Try to find the actual algorithm
  console.log('\n=== Trying to extract algorithm ===');
  
  // Look for patterns like: for(i=0; i<str.length; i+=2) { parseInt(str.substr(i,2), 16) }
  const hexLoopPattern = js.match(/for\s*\([^)]*\+\s*=\s*2[^)]*\)\s*\{[^}]+\}/g) || [];
  console.log('Hex loops (i+=2):', hexLoopPattern.length);
  if (hexLoopPattern.length > 0) {
    console.log('First hex loop:', hexLoopPattern[0]);
  }
  
  // Look for substring(i, i+2) pattern
  const substrPattern = js.match(/substr(?:ing)?\s*\(\s*\w+\s*,\s*(?:\w+\s*\+\s*)?2\s*\)/g) || [];
  console.log('substr(i, 2) patterns:', substrPattern.length);
  
  // Look for the actual decode call
  console.log('\n=== Looking for decode invocation ===');
  
  // Find where the decoded content is used
  const decodedUse = js.match(/(?:file|source|url)\s*=\s*\w+\s*\([^)]+\)/gi) || [];
  console.log('Decoded use:', decodedUse.slice(0, 10));
}

fetchDecoder().catch(console.error);
