#!/usr/bin/env bun
/**
 * Deep analysis of the encoding pattern
 * 
 * From the XOR analysis, the key bytes are:
 * [29, 1, 46, 78, 79, 91, 102, 93, 8, 31, 8, 18, 17, 67, 9, 81, 80, 112, 0, 13, 24, 117, 52, 66, 2, 18, 23, 35, 19, ...]
 * 
 * These don't match WHAT header directly. Let's find the pattern.
 */

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

async function fetchEncoded(source: string, id: string, streamNo: string) {
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
  
  // Parse protobuf - skip field tag and length
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  return { 
    data: bytes.slice(idx), 
    whatHeader,
  };
}

async function analyzeMultipleSamples() {
  // Fetch multiple samples to find the pattern
  const samples = [
    { source: 'alpha', id: 'nba-tv-1', streamNo: '1' },
    { source: 'alpha', id: 'espn-1', streamNo: '1' },
    { source: 'charlie', id: 'sky-sports-main-event-1', streamNo: '1' },
  ];
  
  for (const sample of samples) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Sample: ${sample.source}/${sample.id}/${sample.streamNo}`);
    console.log('='.repeat(60));
    
    try {
      const { data, whatHeader } = await fetchEncoded(sample.source, sample.id, sample.streamNo);
      
      console.log('WHAT header:', whatHeader);
      console.log('Encoded (first 50):', new TextDecoder().decode(data).substring(0, 50));
      
      // The expected URL format
      const expectedPrefix = 'https://lb';
      
      // Derive the XOR key from known plaintext
      const derivedKey: number[] = [];
      for (let i = 0; i < Math.min(data.length, 50); i++) {
        if (i < expectedPrefix.length) {
          derivedKey.push(data[i] ^ expectedPrefix.charCodeAt(i));
        }
      }
      
      console.log('Derived key (first 10):', derivedKey.slice(0, 10));
      console.log('WHAT bytes (first 10):', Array.from(whatHeader).slice(0, 10).map(c => c.charCodeAt(0)));
      
      // Check if derived key = WHAT XOR something
      console.log('\nLooking for pattern: derivedKey[i] = WHAT[i] XOR X');
      for (let i = 0; i < 10; i++) {
        const xorVal = derivedKey[i] ^ whatHeader.charCodeAt(i);
        console.log(`  [${i}] derived=${derivedKey[i]} WHAT=${whatHeader.charCodeAt(i)} XOR=${xorVal} (${String.fromCharCode(xorVal)})`);
      }
      
      // Check if the XOR values form a pattern
      const xorValues: number[] = [];
      for (let i = 0; i < 10; i++) {
        xorValues.push(derivedKey[i] ^ whatHeader.charCodeAt(i));
      }
      console.log('XOR values:', xorValues);
      
      // Check if XOR values are related to position
      console.log('\nChecking if XOR = f(position):');
      for (let i = 0; i < 10; i++) {
        console.log(`  [${i}] XOR=${xorValues[i]} | i*8=${i*8} | i^0x50=${i^0x50} | (i+1)*8=${(i+1)*8}`);
      }
      
    } catch (error: any) {
      console.log('Error:', error.message);
    }
  }
}

async function tryAllDecodingMethods() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const { data, whatHeader } = await fetchEncoded(source, id, streamNo);
  
  console.log('\n' + '='.repeat(60));
  console.log('TRYING ALL DECODING METHODS');
  console.log('='.repeat(60));
  
  const expectedPrefix = 'https://lb';
  
  // Method 1: XOR with WHAT header bytes shifted by various amounts
  console.log('\n--- Method 1: Shifted WHAT XOR ---');
  for (let shift = 0; shift < 32; shift++) {
    let decoded = '';
    for (let i = 0; i < data.length; i++) {
      decoded += String.fromCharCode(data[i] ^ whatHeader.charCodeAt((i + shift) % whatHeader.length));
    }
    if (decoded.startsWith(expectedPrefix)) {
      console.log(`Shift ${shift}: SUCCESS!`);
      console.log(`URL: ${decoded}`);
      return decoded;
    }
  }
  
  // Method 2: XOR with WHAT header bytes XOR'd with position
  console.log('\n--- Method 2: WHAT[i] XOR i ---');
  for (let mult = 1; mult <= 16; mult++) {
    let decoded = '';
    for (let i = 0; i < data.length; i++) {
      const key = whatHeader.charCodeAt(i % whatHeader.length) ^ (i * mult);
      decoded += String.fromCharCode(data[i] ^ (key & 0xFF));
    }
    if (decoded.startsWith(expectedPrefix)) {
      console.log(`Mult ${mult}: SUCCESS!`);
      console.log(`URL: ${decoded}`);
      return decoded;
    }
  }
  
  // Method 3: XOR with WHAT header bytes XOR'd with constant
  console.log('\n--- Method 3: WHAT[i] XOR constant ---');
  for (let constant = 0; constant < 256; constant++) {
    let decoded = '';
    for (let i = 0; i < data.length; i++) {
      const key = whatHeader.charCodeAt(i % whatHeader.length) ^ constant;
      decoded += String.fromCharCode(data[i] ^ key);
    }
    if (decoded.startsWith(expectedPrefix)) {
      console.log(`Constant ${constant}: SUCCESS!`);
      console.log(`URL: ${decoded}`);
      return decoded;
    }
  }
  
  // Method 4: The key might be derived from WHAT header differently
  // Try: key = WHAT[i] XOR WHAT[(i+offset) % 32]
  console.log('\n--- Method 4: WHAT[i] XOR WHAT[i+offset] ---');
  for (let offset = 1; offset < 32; offset++) {
    let decoded = '';
    for (let i = 0; i < data.length; i++) {
      const key = whatHeader.charCodeAt(i % whatHeader.length) ^ whatHeader.charCodeAt((i + offset) % whatHeader.length);
      decoded += String.fromCharCode(data[i] ^ key);
    }
    if (decoded.startsWith(expectedPrefix)) {
      console.log(`Offset ${offset}: SUCCESS!`);
      console.log(`URL: ${decoded}`);
      return decoded;
    }
  }
  
  // Method 5: The key might use a different index mapping
  // Try: key = WHAT[f(i)] where f is some function
  console.log('\n--- Method 5: Different index mappings ---');
  const indexFunctions = [
    (i: number) => (i * 2) % whatHeader.length,
    (i: number) => (i * 3) % whatHeader.length,
    (i: number) => (i * 5) % whatHeader.length,
    (i: number) => (i * 7) % whatHeader.length,
    (i: number) => (whatHeader.length - 1 - (i % whatHeader.length)),
    (i: number) => ((i * i) % whatHeader.length),
    (i: number) => ((i + Math.floor(i / whatHeader.length)) % whatHeader.length),
  ];
  
  for (let fi = 0; fi < indexFunctions.length; fi++) {
    const f = indexFunctions[fi];
    let decoded = '';
    for (let i = 0; i < data.length; i++) {
      decoded += String.fromCharCode(data[i] ^ whatHeader.charCodeAt(f(i)));
    }
    if (decoded.startsWith(expectedPrefix)) {
      console.log(`Function ${fi}: SUCCESS!`);
      console.log(`URL: ${decoded}`);
      return decoded;
    }
  }
  
  // Method 6: The encoding might use a running state
  console.log('\n--- Method 6: Running state XOR ---');
  for (let seed = 0; seed < 256; seed++) {
    let state = seed;
    let decoded = '';
    for (let i = 0; i < data.length; i++) {
      const key = whatHeader.charCodeAt(i % whatHeader.length) ^ state;
      decoded += String.fromCharCode(data[i] ^ key);
      state = (state + 1) & 0xFF;
    }
    if (decoded.startsWith(expectedPrefix)) {
      console.log(`Seed ${seed}: SUCCESS!`);
      console.log(`URL: ${decoded}`);
      return decoded;
    }
  }
  
  // Method 7: The key might be the WHAT header processed through some hash
  console.log('\n--- Method 7: Processed WHAT header ---');
  
  // Try: each byte of key = sum of WHAT bytes up to that position
  let runningSum = 0;
  let decoded7 = '';
  for (let i = 0; i < data.length; i++) {
    runningSum = (runningSum + whatHeader.charCodeAt(i % whatHeader.length)) & 0xFF;
    decoded7 += String.fromCharCode(data[i] ^ runningSum);
  }
  console.log('Running sum:', decoded7.substring(0, 30));
  
  // Try: each byte of key = XOR of all WHAT bytes up to that position
  let runningXor = 0;
  let decoded8 = '';
  for (let i = 0; i < data.length; i++) {
    runningXor ^= whatHeader.charCodeAt(i % whatHeader.length);
    decoded8 += String.fromCharCode(data[i] ^ runningXor);
  }
  console.log('Running XOR:', decoded8.substring(0, 30));
  
  // Method 8: The key might be position-dependent in a complex way
  console.log('\n--- Method 8: Complex position-dependent ---');
  
  // Derive the actual key from known plaintext
  const expectedUrl = 'https://lb5.strmd.top/secure/';
  const actualKey: number[] = [];
  for (let i = 0; i < expectedUrl.length; i++) {
    actualKey.push(data[i] ^ expectedUrl.charCodeAt(i));
  }
  console.log('Actual key bytes:', actualKey);
  console.log('WHAT bytes:', Array.from(whatHeader).map(c => c.charCodeAt(0)));
  
  // Find the relationship between actual key and WHAT header
  console.log('\nRelationship analysis:');
  for (let i = 0; i < actualKey.length; i++) {
    const whatByte = whatHeader.charCodeAt(i % whatHeader.length);
    const diff = actualKey[i] - whatByte;
    const xor = actualKey[i] ^ whatByte;
    console.log(`  [${i}] key=${actualKey[i]} WHAT=${whatByte} diff=${diff} xor=${xor}`);
  }
  
  console.log('\nNo simple pattern found. The encoding might be more complex.');
  return null;
}

async function main() {
  await analyzeMultipleSamples();
  await tryAllDecodingMethods();
}

main().catch(console.error);
