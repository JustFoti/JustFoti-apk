// Full analysis of VidSrc decoder - look for the actual decode logic
const fs = require('fs');

const packed = fs.readFileSync('vidsrc-decoder-script.js', 'utf8');

console.log('Full VidSrc decoder analysis...\n');
console.log('Script size:', packed.length, 'bytes');

// The script is PlayerJS - let's find the specific decode function
// PlayerJS typically has a function that processes encoded content

// Look for the pjs_main pattern
console.log('\n=== Looking for PlayerJS patterns ===');

// Find where the encoded content is processed
// The div content is pure hex, so we need to find hex processing

// Search for patterns that suggest hex decode
const patterns = [
  /for\s*\([^)]+\)\s*\{[^}]*parseInt[^}]*\}/g,
  /while\s*\([^)]+\)\s*\{[^}]*parseInt[^}]*\}/g,
  /\.match\s*\(\s*\/\.\{2\}\/g\s*\)/g,  // Match pairs of chars
  /substring\s*\(\s*\w+\s*,\s*\w+\s*\+\s*2\s*\)/g,  // substring(i, i+2)
];

for (const pattern of patterns) {
  const matches = packed.match(pattern) || [];
  if (matches.length > 0) {
    console.log(`Pattern ${pattern.source.substring(0, 30)}:`, matches.length);
    matches.slice(0, 3).forEach(m => console.log('  ', m.substring(0, 100)));
  }
}

// Look for the specific function that handles the encoded div
// The div ID changes each time, so look for dynamic ID handling

console.log('\n=== Looking for dynamic div handling ===');

// Pattern: document.getElementById(variable)
const dynamicIdPattern = packed.match(/getElementById\s*\(\s*\w+\s*\)/g) || [];
console.log('Dynamic getElementById:', dynamicIdPattern);

// Pattern: innerHTML access
const innerHtmlAccess = packed.match(/\.\s*innerHTML\s*[=;]/g) || [];
console.log('innerHTML access:', innerHtmlAccess.length);

// Look for the decode key
console.log('\n=== Looking for decode key ===');

// The key might be embedded in the script or derived from something
// Look for long hex strings that could be keys
const hexKeys = packed.match(/["'][0-9a-f]{16,}["']/gi) || [];
console.log('Hex keys:', hexKeys.slice(0, 10));

// Look for base64 strings that could be keys
const b64Keys = packed.match(/["'][A-Za-z0-9+/]{20,}={0,2}["']/g) || [];
console.log('Base64 keys:', b64Keys.slice(0, 10));

// Look for the actual decode algorithm
console.log('\n=== Searching for decode algorithm ===');

// The content is hex, so the decode likely involves:
// 1. Split into pairs
// 2. parseInt each pair as hex
// 3. XOR or other transform
// 4. Convert to string

// Search for the transform function
const transformPatterns = [
  /charCodeAt\s*\([^)]*\)\s*\^\s*\d+/g,  // XOR with number
  /charCodeAt\s*\([^)]*\)\s*\^\s*\w+/g,  // XOR with variable
  /fromCharCode\s*\([^)]*\^\s*[^)]+\)/g,  // fromCharCode with XOR
];

for (const pattern of transformPatterns) {
  const matches = packed.match(pattern) || [];
  if (matches.length > 0) {
    console.log(`Transform pattern:`, matches.slice(0, 5));
  }
}

// Look for the specific PlayerJS decode function
// PlayerJS uses a function called "file" or similar to get the stream URL

console.log('\n=== Looking for file/stream URL extraction ===');

// Search for where the m3u8 URL is constructed
const m3u8Index = packed.indexOf('m3u8');
if (m3u8Index > -1) {
  console.log('Context around m3u8:');
  console.log(packed.substring(Math.max(0, m3u8Index - 300), m3u8Index + 100));
}

// Look for the shadowlandschronicles domain
const shadowIndex = packed.indexOf('shadowlands');
if (shadowIndex > -1) {
  console.log('\nContext around shadowlands:');
  console.log(packed.substring(Math.max(0, shadowIndex - 200), shadowIndex + 200));
}

// Look for https:// construction
const httpsPattern = packed.match(/["']https:\/\/["']\s*\+/g) || [];
console.log('\nhttps:// concatenations:', httpsPattern.length);

// Look for the actual decode call
console.log('\n=== Looking for decode invocation ===');

// The decode function is likely called with the div content
// Look for patterns like: decode(content) or decrypt(content)

const decodeCallPatterns = [
  /\w+\s*\(\s*\w+\.innerHTML\s*\)/g,
  /\w+\s*\(\s*document\.getElementById[^)]+\)\.innerHTML\s*\)/g,
  /decrypt\s*\(/g,
  /decode\s*\(/g,
];

for (const pattern of decodeCallPatterns) {
  const matches = packed.match(pattern) || [];
  if (matches.length > 0) {
    console.log(`Decode call pattern:`, matches.slice(0, 5));
  }
}

// Let's try to find the actual algorithm by looking at the unpacked eval
console.log('\n=== Attempting to unpack eval ===');

// Find all eval calls
const evalCalls = packed.match(/eval\s*\([^)]+\)/g) || [];
console.log('eval() calls:', evalCalls.length);

// The main eval is at the start - let's extract it
const mainEvalMatch = packed.match(/eval\(function\(p,a,c,k,e,d\)\{([\s\S]*?)\}\('([\s\S]*?)',(\d+),(\d+),'([^']+)'\.split\('\|'\)/);

if (mainEvalMatch) {
  console.log('\nFound main eval packer!');
  
  const p = mainEvalMatch[2];
  const a = parseInt(mainEvalMatch[3]);
  const c = parseInt(mainEvalMatch[4]);
  const k = mainEvalMatch[5].split('|');
  
  console.log('a:', a, 'c:', c, 'k.length:', k.length);
  console.log('First 20 k values:', k.slice(0, 20));
  
  // Unpack
  function unpack(p, a, c, k, e, d) {
    e = function(c) {
      return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
    };
    while (c--) {
      if (k[c]) {
        p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
      }
    }
    return p;
  }
  
  try {
    const unpacked = unpack(p, a, c, k, 0, {});
    fs.writeFileSync('vidsrc-decoder-unpacked.js', unpacked);
    console.log('\n✓ Unpacked! Size:', unpacked.length);
    console.log('Preview:', unpacked.substring(0, 500));
    
    // Now search the unpacked code for decode logic
    console.log('\n=== Analyzing unpacked code ===');
    
    // Look for the file/source assignment
    const fileAssign = unpacked.match(/file\s*[:=]\s*[^,;\n]+/gi) || [];
    console.log('file assignments:', fileAssign.slice(0, 5));
    
    // Look for decode function
    const decodeFn = unpacked.match(/function\s+\w*decode\w*\s*\([^)]*\)/gi) || [];
    console.log('decode functions:', decodeFn);
    
  } catch (e) {
    console.log('Unpack failed:', e.message);
  }
} else {
  console.log('Could not find main eval packer');
  
  // Try alternative pattern
  const altMatch = packed.match(/eval\(function\(p,a,c,k,e,d\)\{[\s\S]{100,500}\}\('([^']{1000,})',\s*(\d+),\s*(\d+),\s*'([^']+)'\.split/);
  if (altMatch) {
    console.log('Found alternative eval pattern');
  }
}
