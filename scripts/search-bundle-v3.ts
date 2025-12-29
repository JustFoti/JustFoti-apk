#!/usr/bin/env bun
/**
 * Found the XOR function:
 * function it(e){if(!e)return;const t=st(8,-826);let s="".split("").reverse().join("");const r=t.length;for(let i=0;i<e.length;i++){const n=e.charCodeAt(i)^t.charCodeAt(i%r);s+=String.fromCharCode(n)}}
 * 
 * The key comes from st(8,-826)
 * st is defined as: function st(e,t){const s=rt();return(st=function(e,t){return s[e-=0]})(e,t)}
 * rt returns an array of strings
 * 
 * Let's decode this!
 */

// The rt() function returns this array:
const rtArray = [
  "CsLPpZ8932212".split("").reverse().join(""),  // "212239Z8PpLsC"
  "htgnel".split("").reverse().join(""),          // "length"
  "UZpUzY5895021".split("").reverse().join(""),  // "1205985YzUpZU"
  "yJZuxA9452121".split("").reverse().join(""),  // "1212549AxuZJy"
  "tAedoCrahc".split("").reverse().join(""),      // "charCodeAt"
  "btoa",
  "q#<K@C".split("").reverse().join(""),          // "C@K<#q"
  "1164HyWkyu",
  "4154136SJSwNe",
  "IITNvu6344771".split("").reverse().join(""),  // "1774436uvNTII"
  "edoCrahCmorf".split("").reverse().join(""),    // "fromCharCode"
  "554Biqadw",
  "oShtCc7412072".split("").reverse().join(""),  // "2702147cCthSo"
];

console.log('rt() array:');
rtArray.forEach((s, i) => console.log(`  [${i}]: "${s}"`));

// st(8,-826) returns rtArray[8-0] = rtArray[8]
// Wait, the function is: return s[e-=0]
// So st(8, -826) returns s[8] = "4154136SJSwNe"

const key = rtArray[8];
console.log('\nKey from st(8,-826):', key);

// But wait, let me re-read the code more carefully
// The st function does: return s[e-=0]
// e -= 0 is just e, so it returns s[e] = s[8]

// Actually, looking at the pattern, these look like obfuscated strings
// Let me check if the key is actually different

// The function it(e) XORs the input with the key
// Let's test this with our encoded data

async function testDecode() {
  const EMBED_BASE = 'https://embedsports.top';
  
  function encodeProtobuf(source: string, id: string, streamNo: string): Uint8Array {
    const sourceBytes = new TextEncoder().encode(source);
    const idBytes = new TextEncoder().encode(id);
    const streamNoBytes = new TextEncoder().encode(streamNo);
    
    const result: number[] = [];
    result.push(0x0a, sourceBytes.length, ...sourceBytes);
    result.push(0x12, idBytes.length, ...idBytes);
    result.push(0x1a, streamNoBytes.length, ...streamNoBytes);
    
    return new Uint8Array(result);
  }
  
  const source = 'golf';
  const id = '18634';
  const streamNo = '1';
  
  const protoBody = encodeProtobuf(source, id, streamNo);
  
  const response = await fetch(`${EMBED_BASE}/fetch`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Content-Type': 'application/octet-stream',
      'Origin': EMBED_BASE,
      'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
    },
    body: protoBody,
  });

  const whatHeader = response.headers.get('what');
  if (!whatHeader) throw new Error('No WHAT header');
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  const data = bytes.slice(idx);
  const encodedStr = new TextDecoder().decode(data);
  
  console.log('\n=== Testing decode ===');
  console.log('WHAT header:', whatHeader);
  console.log('Encoded data length:', encodedStr.length);
  console.log('Encoded data:', encodedStr.substring(0, 50));
  
  // Try decoding with the key we found
  const testKeys = [
    key,
    whatHeader,
    whatHeader.substring(7), // Without "ISEEYO" prefix
    "C@K<#q", // Another string from the array
  ];
  
  for (const testKey of testKeys) {
    let decoded = '';
    for (let i = 0; i < encodedStr.length; i++) {
      const n = encodedStr.charCodeAt(i) ^ testKey.charCodeAt(i % testKey.length);
      decoded += String.fromCharCode(n);
    }
    
    console.log(`\nKey "${testKey.substring(0, 20)}..." (len=${testKey.length}):`);
    console.log('  Decoded:', decoded.substring(0, 80));
    
    if (decoded.startsWith('https://lb') || decoded.includes('strmd.top')) {
      console.log('  *** FOUND IT! ***');
      console.log('  Full decoded:', decoded);
    }
  }
  
  // The key might be derived from WHAT header in some way
  // Let's try different derivations
  console.log('\n=== Trying WHAT header derivations ===');
  
  // Maybe the key is WHAT header XORed with something
  // Or maybe it's a hash of WHAT header
  
  // Let's try: key = WHAT header with each char XORed with its position
  let derivedKey1 = '';
  for (let i = 0; i < whatHeader.length; i++) {
    derivedKey1 += String.fromCharCode(whatHeader.charCodeAt(i) ^ i);
  }
  
  let decoded1 = '';
  for (let i = 0; i < encodedStr.length; i++) {
    const n = encodedStr.charCodeAt(i) ^ derivedKey1.charCodeAt(i % derivedKey1.length);
    decoded1 += String.fromCharCode(n);
  }
  console.log('Key = WHAT ^ position:', decoded1.substring(0, 80));
  
  // Try: key = WHAT header reversed
  const reversedWhat = whatHeader.split('').reverse().join('');
  let decoded2 = '';
  for (let i = 0; i < encodedStr.length; i++) {
    const n = encodedStr.charCodeAt(i) ^ reversedWhat.charCodeAt(i % reversedWhat.length);
    decoded2 += String.fromCharCode(n);
  }
  console.log('Key = reversed WHAT:', decoded2.substring(0, 80));
  
  // The it() function is used to encode the X-SW-Key header
  // It's not the decode function for the response!
  // Let me search for where the response is decoded
}

testDecode().catch(console.error);
