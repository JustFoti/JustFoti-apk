#!/usr/bin/env bun
/**
 * New approach: Collect multiple samples and analyze the encoding pattern
 * The key insight is that the encoding is deterministic - same input = same output
 * So we can analyze the relationship between WHAT header and the encoded data
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
  
  // Skip protobuf header (field 1, length-delimited)
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  return { data: bytes.slice(idx), whatHeader, rawResponse: bytes };
}

// Base64 decode
function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Try AES decryption
async function tryAES(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<string | null> {
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'AES-CBC' }, false, ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv }, cryptoKey, data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

// Custom substitution cipher based on WHAT header
function customDecode(data: Uint8Array, what: string): string {
  const whatBytes = new TextEncoder().encode(what);
  const result = new Uint8Array(data.length);
  
  // Try: each byte is decoded using a lookup table derived from WHAT
  // The WHAT header might define a substitution table
  
  // Build a substitution table from WHAT header
  // WHAT is 32 chars, which could be a key for a 256-byte substitution table
  
  for (let i = 0; i < data.length; i++) {
    // Try different formulas
    const whatIdx = i % whatBytes.length;
    const whatByte = whatBytes[whatIdx];
    
    // Formula 1: Simple XOR
    // result[i] = data[i] ^ whatByte;
    
    // Formula 2: XOR with position-modified key
    // result[i] = data[i] ^ ((whatByte + i) % 256);
    
    // Formula 3: Subtract key
    // result[i] = (data[i] - whatByte + 256) % 256;
    
    // Formula 4: XOR with rotated key
    const rotatedKey = ((whatByte << (i % 8)) | (whatByte >> (8 - (i % 8)))) & 0xFF;
    result[i] = data[i] ^ rotatedKey;
  }
  
  return new TextDecoder('utf-8', { fatal: false }).decode(result);
}

// Vigenere cipher decode
function vigenereDecode(data: Uint8Array, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const result = new Uint8Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    const keyByte = keyBytes[i % keyBytes.length];
    // Vigenere: plaintext = (ciphertext - key + 26) % 26 for letters
    // For bytes: plaintext = (ciphertext - key + 256) % 256
    result[i] = (data[i] - keyByte + 256) % 256;
  }
  
  return new TextDecoder('utf-8', { fatal: false }).decode(result);
}

async function analyzeMultipleSamples() {
  // Fetch the same stream multiple times to see if encoding changes
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
  console.log('Fetching multiple samples...\n');
  
  const samples: { data: Uint8Array; whatHeader: string }[] = [];
  
  for (let i = 0; i < 3; i++) {
    const sample = await fetchEncoded(source, id, streamNo);
    samples.push(sample);
    console.log(`Sample ${i + 1}:`);
    console.log(`  WHAT: ${sample.whatHeader}`);
    console.log(`  Data: ${new TextDecoder().decode(sample.data).substring(0, 60)}...`);
    console.log(`  Length: ${sample.data.length}`);
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Check if WHAT header changes between requests
  const uniqueWhats = new Set(samples.map(s => s.whatHeader));
  console.log(`\nUnique WHAT headers: ${uniqueWhats.size}`);
  
  if (uniqueWhats.size > 1) {
    console.log('WHAT header changes between requests - encoding is dynamic!');
    
    // Compare the encoded data when WHAT changes
    for (let i = 0; i < samples.length; i++) {
      for (let j = i + 1; j < samples.length; j++) {
        if (samples[i].whatHeader !== samples[j].whatHeader) {
          console.log(`\nComparing samples ${i + 1} and ${j + 1}:`);
          console.log(`  WHAT ${i + 1}: ${samples[i].whatHeader}`);
          console.log(`  WHAT ${j + 1}: ${samples[j].whatHeader}`);
          
          // The plaintext should be the same (same URL)
          // So we can derive the encoding by comparing
          let diffCount = 0;
          for (let k = 0; k < Math.min(samples[i].data.length, samples[j].data.length); k++) {
            if (samples[i].data[k] !== samples[j].data[k]) {
              diffCount++;
            }
          }
          console.log(`  Different bytes: ${diffCount} / ${samples[i].data.length}`);
        }
      }
    }
  }
  
  // Use the first sample for analysis
  const { data, whatHeader } = samples[0];
  
  console.log('\n--- Trying various decoding methods ---\n');
  
  // The expected plaintext structure
  const expectedPrefix = 'https://lb';
  const expectedContains = ['.strmd.top', '/secure/', '/stream/', '/playlist.m3u8'];
  
  // Method 1: Simple XOR with WHAT
  console.log('1. Simple XOR with WHAT header:');
  const whatBytes = new TextEncoder().encode(whatHeader);
  let decoded1 = '';
  for (let i = 0; i < data.length; i++) {
    decoded1 += String.fromCharCode(data[i] ^ whatBytes[i % whatBytes.length]);
  }
  console.log(`   ${decoded1.substring(0, 80)}`);
  
  // Method 2: XOR with reversed WHAT
  console.log('\n2. XOR with reversed WHAT:');
  const reversedWhat = whatHeader.split('').reverse().join('');
  const reversedBytes = new TextEncoder().encode(reversedWhat);
  let decoded2 = '';
  for (let i = 0; i < data.length; i++) {
    decoded2 += String.fromCharCode(data[i] ^ reversedBytes[i % reversedBytes.length]);
  }
  console.log(`   ${decoded2.substring(0, 80)}`);
  
  // Method 3: Vigenere decode
  console.log('\n3. Vigenere decode:');
  const decoded3 = vigenereDecode(data, whatHeader);
  console.log(`   ${decoded3.substring(0, 80)}`);
  
  // Method 4: Try base64 decode first
  console.log('\n4. Base64 decode attempt:');
  try {
    const dataStr = new TextDecoder().decode(data);
    const decoded4 = atob(dataStr);
    console.log(`   ${decoded4.substring(0, 80)}`);
  } catch (e) {
    console.log('   Not valid base64');
  }
  
  // Method 5: Look for patterns in the data
  console.log('\n5. Character frequency analysis:');
  const freq: { [key: string]: number } = {};
  const dataStr = new TextDecoder().decode(data);
  for (const char of dataStr) {
    freq[char] = (freq[char] || 0) + 1;
  }
  const sortedFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('   Top 10 chars:', sortedFreq.map(([c, n]) => `'${c}':${n}`).join(', '));
  
  // Method 6: Try to find the XOR key by assuming we know parts of the plaintext
  console.log('\n6. Deriving XOR key from known plaintext:');
  
  // We know the URL starts with "https://lb" and ends with "playlist.m3u8"
  // Let's derive what the XOR key would need to be
  
  const knownStart = 'https://lb';
  const derivedKeyStart: number[] = [];
  for (let i = 0; i < knownStart.length; i++) {
    derivedKeyStart.push(data[i] ^ knownStart.charCodeAt(i));
  }
  console.log('   Derived key from start:', derivedKeyStart.map(b => String.fromCharCode(b)).join(''));
  console.log('   As bytes:', derivedKeyStart);
  
  // Check if derived key matches WHAT header at any offset
  const derivedStr = derivedKeyStart.map(b => String.fromCharCode(b)).join('');
  for (let offset = 0; offset < whatHeader.length; offset++) {
    let matches = true;
    for (let i = 0; i < derivedKeyStart.length && matches; i++) {
      if (whatBytes[(offset + i) % whatBytes.length] !== derivedKeyStart[i]) {
        matches = false;
      }
    }
    if (matches) {
      console.log(`   Key matches WHAT at offset ${offset}!`);
    }
  }
  
  // Method 7: Try XOR with each possible single-byte offset
  console.log('\n7. Trying all single-byte XOR keys:');
  for (let key = 0; key < 256; key++) {
    let decoded = '';
    for (let i = 0; i < Math.min(10, data.length); i++) {
      decoded += String.fromCharCode(data[i] ^ key);
    }
    if (decoded.startsWith('https://lb') || decoded.startsWith('http')) {
      console.log(`   Key ${key} (0x${key.toString(16)}): ${decoded}`);
    }
  }
  
  // Method 8: The encoding might use a state machine or LFSR
  console.log('\n8. Analyzing byte-to-byte relationships:');
  
  // Check if there's a pattern in consecutive byte differences
  const diffs: number[] = [];
  for (let i = 1; i < Math.min(20, data.length); i++) {
    diffs.push((data[i] - data[i-1] + 256) % 256);
  }
  console.log('   Consecutive diffs:', diffs);
  
  // Check XOR between consecutive bytes
  const xorDiffs: number[] = [];
  for (let i = 1; i < Math.min(20, data.length); i++) {
    xorDiffs.push(data[i] ^ data[i-1]);
  }
  console.log('   Consecutive XORs:', xorDiffs);
}

analyzeMultipleSamples().catch(console.error);
