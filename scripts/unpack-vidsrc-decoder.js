// Unpack and analyze VidSrc decoder
const fs = require('fs');

// Read the packed script
const packed = fs.readFileSync('vidsrc-decoder-script.js', 'utf8');

console.log('Unpacking VidSrc decoder...\n');

// The script uses eval(function(p,a,c,k,e,d){...}) packer
// Let's extract and unpack it

// Find the eval wrapper
const evalMatch = packed.match(/eval\(function\(p,a,c,k,e,d\)\{([^}]+)\}(\([^)]+\))\)/);

if (!evalMatch) {
  console.log('Could not find eval packer pattern');
  
  // Try to find the actual decode logic by searching for patterns
  console.log('\n=== Searching for decode patterns ===');
  
  // Look for hex decode pattern
  const hexDecodePattern = packed.match(/parseInt\s*\([^,]+,\s*16\s*\)/g) || [];
  console.log('parseInt(x, 16) calls:', hexDecodePattern.length);
  
  // Look for the specific XOR values we found
  console.log('\nXOR values found: ^283, ^255, ^99');
  
  // Search for context around XOR 283
  const xor283Index = packed.indexOf('^283');
  if (xor283Index > -1) {
    console.log('\nContext around ^283:');
    console.log(packed.substring(Math.max(0, xor283Index - 200), xor283Index + 200));
  }
  
  // Look for the file/source pattern
  const filePattern = packed.match(/file\s*[=:]\s*[^,;\n]+/gi) || [];
  console.log('\nFile patterns:', filePattern.slice(0, 10));
  
  // Look for m3u8 references
  const m3u8Pattern = packed.match(/m3u8/gi) || [];
  console.log('m3u8 references:', m3u8Pattern.length);
  
  // Look for shadowlandschronicles
  const shadowPattern = packed.match(/shadowlands/gi) || [];
  console.log('shadowlands references:', shadowPattern.length);
  
  // Look for the decode function that processes the div content
  // The div ID was "sXnL9MQIry" - search for patterns that might use it
  
  // Search for getElementById or similar
  const getElemPattern = packed.match(/getElementById|querySelector|getElement/gi) || [];
  console.log('DOM access patterns:', getElemPattern.length);
  
  // The content is pure hex - look for hex processing
  // Pattern: take 2 chars, parseInt(x, 16), fromCharCode
  const hexProcessPattern = packed.match(/substring\s*\([^)]+\)[^;]*parseInt[^;]*16[^;]*fromCharCode/gi) || [];
  console.log('Hex process patterns:', hexProcessPattern.length);
  
  // Let's try to manually decode the hex content
  console.log('\n=== Manual hex decode attempt ===');
  
  // Sample encoded content from VidSrc
  const sampleEncoded = '141c170a30620b137b355c5d2f2b210c0917213a16523e09502f485b3a280839211c13740271126f6011292b1e28397a0807';
  
  // Try direct hex decode
  let decoded = '';
  for (let i = 0; i < sampleEncoded.length; i += 2) {
    const code = parseInt(sampleEncoded.substring(i, i + 2), 16);
    decoded += String.fromCharCode(code);
  }
  console.log('Direct hex decode:', decoded);
  console.log('Hex codes:', decoded.split('').map(c => c.charCodeAt(0)));
  
  // Try XOR with different keys
  const xorKeys = [283, 255, 99, 42, 69, 127, 13, 7, 3, 1];
  for (const key of xorKeys) {
    let xorDecoded = '';
    for (let i = 0; i < sampleEncoded.length; i += 2) {
      const code = parseInt(sampleEncoded.substring(i, i + 2), 16);
      xorDecoded += String.fromCharCode(code ^ (key % 256));
    }
    if (xorDecoded.includes('http') || xorDecoded.includes('://')) {
      console.log(`XOR ${key}:`, xorDecoded);
    }
  }
  
  // Try XOR with rotating key
  const rotatingKeys = [
    [0x14, 0x1c, 0x17, 0x0a], // First 4 bytes of encoded
    [0x68, 0x74, 0x74, 0x70], // 'http' in hex
  ];
  
  for (const keyArr of rotatingKeys) {
    let rotDecoded = '';
    for (let i = 0; i < sampleEncoded.length; i += 2) {
      const code = parseInt(sampleEncoded.substring(i, i + 2), 16);
      const keyByte = keyArr[Math.floor(i / 2) % keyArr.length];
      rotDecoded += String.fromCharCode(code ^ keyByte);
    }
    console.log(`Rotating XOR [${keyArr.map(k => k.toString(16)).join(',')}]:`, rotDecoded.substring(0, 50));
  }
  
  // The XOR key might be derived from the div ID
  const divId = 'sXnL9MQIry';
  let divKeyDecoded = '';
  for (let i = 0; i < sampleEncoded.length; i += 2) {
    const code = parseInt(sampleEncoded.substring(i, i + 2), 16);
    const keyChar = divId.charCodeAt(Math.floor(i / 2) % divId.length);
    divKeyDecoded += String.fromCharCode(code ^ keyChar);
  }
  console.log(`XOR with divId "${divId}":`, divKeyDecoded.substring(0, 50));
  
  // Try to find the actual key in the script
  console.log('\n=== Looking for key patterns ===');
  
  // Look for string that might be the key
  const keyPatterns = packed.match(/["'][a-zA-Z0-9]{8,20}["']/g) || [];
  console.log('Potential keys:', keyPatterns.slice(0, 20));
  
} else {
  console.log('Found eval packer, unpacking...');
  
  // The packer function
  const unpack = function(p, a, c, k, e, d) {
    e = function(c) {
      return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
    };
    if (!''.replace(/^/, String)) {
      while (c--) {
        d[e(c)] = k[c] || e(c);
      }
      k = [function(e) { return d[e]; }];
      e = function() { return '\\w+'; };
      c = 1;
    }
    while (c--) {
      if (k[c]) {
        p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
      }
    }
    return p;
  };
  
  // Extract the parameters
  const paramsMatch = packed.match(/eval\(function\(p,a,c,k,e,d\)\{[^}]+\}\('([^']+)',(\d+),(\d+),'([^']+)'\.split\('\|'\)/);
  
  if (paramsMatch) {
    const p = paramsMatch[1];
    const a = parseInt(paramsMatch[2]);
    const c = parseInt(paramsMatch[3]);
    const k = paramsMatch[4].split('|');
    
    console.log('Parameters:');
    console.log('  a:', a);
    console.log('  c:', c);
    console.log('  k length:', k.length);
    
    const unpacked = unpack(p, a, c, k, 0, {});
    
    // Save unpacked
    fs.writeFileSync('vidsrc-decoder-unpacked.js', unpacked);
    console.log('\n✓ Saved unpacked script to vidsrc-decoder-unpacked.js');
    
    // Now analyze the unpacked script
    console.log('\n=== Analyzing unpacked script ===');
    console.log('Size:', unpacked.length, 'bytes');
    
    // Look for decode function
    const decodeFunc = unpacked.match(/function\s+\w*[Dd]ecode\w*\s*\([^)]*\)\s*\{[^}]+\}/g) || [];
    console.log('Decode functions:', decodeFunc.length);
    
    // Look for the hex processing
    const hexProcess = unpacked.match(/parseInt\s*\([^,]+,\s*16\s*\)/g) || [];
    console.log('parseInt(x, 16):', hexProcess.length);
  }
}
