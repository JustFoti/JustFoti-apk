// Find the actual decode algorithm in unpacked PlayerJS
const fs = require('fs');

const unpacked = fs.readFileSync('vidsrc-decoder-unpacked.js', 'utf8');

console.log('Analyzing unpacked PlayerJS for decode algorithm...\n');
console.log('Size:', unpacked.length, 'bytes');

// Look for the fjs function (PlayerJS decode function)
console.log('\n=== Looking for fjs function ===');

const fjsMatch = unpacked.match(/function\s+fjs\s*\([^)]*\)\s*\{[\s\S]{100,2000}?\}/);
if (fjsMatch) {
  console.log('Found fjs function:');
  console.log(fjsMatch[0].substring(0, 1000));
}

// Look for the decode patterns
console.log('\n=== Looking for decode patterns ===');

// PlayerJS uses #0 and #1 prefixes for different encodings
const hashPatterns = unpacked.match(/#[01][A-Za-z0-9+/=]+/g) || [];
console.log('Hash patterns:', hashPatterns.slice(0, 5));

// Look for the alphabet used in custom base64
const alphabetMatch = unpacked.match(/["'][A-Za-z0-9+/]{64}["']/g) || [];
console.log('Potential alphabets:', alphabetMatch);

// Look for charCodeAt usage in decode context
console.log('\n=== Looking for charCodeAt decode ===');

const charCodeContext = [];
let idx = 0;
while ((idx = unpacked.indexOf('charCodeAt', idx)) !== -1) {
  const context = unpacked.substring(Math.max(0, idx - 100), idx + 150);
  if (context.includes('for') || context.includes('while')) {
    charCodeContext.push(context);
  }
  idx++;
}
console.log('charCodeAt in loops:', charCodeContext.length);
if (charCodeContext.length > 0) {
  console.log('First context:', charCodeContext[0]);
}

// Look for the hex decode specifically
console.log('\n=== Looking for hex decode ===');

// The content is pure hex, so look for parseInt with base 16
const parseIntContext = [];
idx = 0;
while ((idx = unpacked.indexOf('parseInt', idx)) !== -1) {
  const context = unpacked.substring(Math.max(0, idx - 50), idx + 100);
  if (context.includes('16')) {
    parseIntContext.push(context);
  }
  idx++;
}
console.log('parseInt with 16:', parseIntContext.length);
parseIntContext.slice(0, 3).forEach(c => console.log(c));

// Look for the file decoding
console.log('\n=== Looking for file decode ===');

// Find where file is decoded
const fileDecodeMatch = unpacked.match(/file\s*=\s*fjs\s*\([^)]+\)/g) || [];
console.log('file = fjs():', fileDecodeMatch);

// Look for the actual decode implementation
console.log('\n=== Looking for decode implementation ===');

// Search for the pattern that processes encoded content
// PlayerJS typically has: if(x.indexOf('#')==0)

const hashCheckMatch = unpacked.match(/indexOf\s*\(\s*['"]#['"]\s*\)/g) || [];
console.log('indexOf("#"):', hashCheckMatch.length);

// Find the context around hash check
const hashCheckIdx = unpacked.indexOf("indexOf('#')");
if (hashCheckIdx > -1) {
  console.log('\nContext around indexOf("#"):');
  console.log(unpacked.substring(hashCheckIdx - 200, hashCheckIdx + 500));
}

// Look for the XOR key
console.log('\n=== Looking for XOR key ===');

const xorPatterns = unpacked.match(/\^\s*\d+/g) || [];
console.log('XOR patterns:', [...new Set(xorPatterns)].slice(0, 20));

// Look for the specific decode that handles hex
console.log('\n=== Looking for hex handler ===');

// The hex content doesn't start with # so it might use a different decoder
// Look for patterns that handle non-# content

const elseMatch = unpacked.match(/else\s*\{[^}]*charCodeAt[^}]*\}/g) || [];
console.log('else blocks with charCodeAt:', elseMatch.length);
if (elseMatch.length > 0) {
  console.log('First else block:', elseMatch[0]);
}

// Look for the actual URL construction
console.log('\n=== Looking for URL construction ===');

const urlConstruct = unpacked.match(/https?:\/\/[^'"]+/g) || [];
console.log('URL patterns:', urlConstruct.slice(0, 10));

// Look for shadowlandschronicles
const shadowIdx = unpacked.indexOf('shadowlands');
if (shadowIdx > -1) {
  console.log('\nContext around shadowlands:');
  console.log(unpacked.substring(shadowIdx - 100, shadowIdx + 200));
}

// Look for the div content processing
console.log('\n=== Looking for div content processing ===');

// The div ID is dynamic, so look for getElementById with variable
const getElemVar = unpacked.match(/getElementById\s*\(\s*\w+\s*\)/g) || [];
console.log('getElementById(var):', getElemVar);

// Look for innerHTML
const innerHtml = unpacked.match(/\.innerHTML/g) || [];
console.log('innerHTML:', innerHtml.length);

// Find context around innerHTML
const innerHtmlIdx = unpacked.indexOf('.innerHTML');
if (innerHtmlIdx > -1) {
  console.log('\nContext around innerHTML:');
  console.log(unpacked.substring(innerHtmlIdx - 200, innerHtmlIdx + 200));
}

// Save a portion of the unpacked script for manual review
console.log('\n=== Saving key sections ===');

// Find the fjs function and save it
const fjsStart = unpacked.indexOf('function fjs');
if (fjsStart > -1) {
  // Find the end of the function (matching braces)
  let braceCount = 0;
  let fjsEnd = fjsStart;
  let started = false;
  
  for (let i = fjsStart; i < unpacked.length && i < fjsStart + 5000; i++) {
    if (unpacked[i] === '{') {
      braceCount++;
      started = true;
    } else if (unpacked[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        fjsEnd = i + 1;
        break;
      }
    }
  }
  
  const fjsFunc = unpacked.substring(fjsStart, fjsEnd);
  fs.writeFileSync('vidsrc-fjs-function.js', fjsFunc);
  console.log('Saved fjs function to vidsrc-fjs-function.js');
  console.log('fjs function preview:', fjsFunc.substring(0, 500));
}
