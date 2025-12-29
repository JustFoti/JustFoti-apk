#!/usr/bin/env bun
/**
 * Key insight: WHAT header changes each request, encoded data changes too
 * But the plaintext (URL) should be the same!
 * 
 * If we XOR two encoded samples together, we get:
 * encoded1 XOR encoded2 = (plain XOR key1) XOR (plain XOR key2) = key1 XOR key2
 * 
 * This means: encoded1 XOR key1 = encoded2 XOR key2 = plaintext
 * 
 * Let's verify this and find the correct XOR formula
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
  
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  return { data: bytes.slice(idx), whatHeader };
}

async function crackWithMultipleSamples() {
  // Use a currently live stream - golf source
  const source = 'golf';
  const id = '18634'; // Lakers vs Kings
  const streamNo = '1';
  
  console.log('Fetching two samples to compare...\n');
  
  const sample1 = await fetchEncoded(source, id, streamNo);
  await new Promise(r => setTimeout(r, 300));
  const sample2 = await fetchEncoded(source, id, streamNo);
  
  console.log('Sample 1 WHAT:', sample1.whatHeader);
  console.log('Sample 2 WHAT:', sample2.whatHeader);
  console.log('Sample 1 data:', new TextDecoder().decode(sample1.data).substring(0, 50));
  console.log('Sample 2 data:', new TextDecoder().decode(sample2.data).substring(0, 50));
  
  const what1 = new TextEncoder().encode(sample1.whatHeader);
  const what2 = new TextEncoder().encode(sample2.whatHeader);
  
  // XOR the two encoded samples - this should give us key1 XOR key2
  const dataXor = new Uint8Array(sample1.data.length);
  for (let i = 0; i < sample1.data.length; i++) {
    dataXor[i] = sample1.data[i] ^ sample2.data[i];
  }
  
  // XOR the two WHAT headers (repeated to match data length)
  const whatXor = new Uint8Array(sample1.data.length);
  for (let i = 0; i < sample1.data.length; i++) {
    whatXor[i] = what1[i % what1.length] ^ what2[i % what2.length];
  }
  
  console.log('\n--- Comparing XORs ---');
  console.log('Data XOR (first 32):', Array.from(dataXor.slice(0, 32)));
  console.log('WHAT XOR (first 32):', Array.from(whatXor.slice(0, 32)));
  
  // Check if they match
  let matchCount = 0;
  for (let i = 0; i < sample1.data.length; i++) {
    if (dataXor[i] === whatXor[i]) matchCount++;
  }
  console.log(`\nMatching bytes: ${matchCount} / ${sample1.data.length}`);
  
  if (matchCount === sample1.data.length) {
    console.log('\n*** PERFECT MATCH! Simple XOR with WHAT header works! ***');
    
    // Decode using simple XOR
    const decoded = new Uint8Array(sample1.data.length);
    for (let i = 0; i < sample1.data.length; i++) {
      decoded[i] = sample1.data[i] ^ what1[i % what1.length];
    }
    console.log('\nDecoded URL:', new TextDecoder().decode(decoded));
    return new TextDecoder().decode(decoded);
  }
  
  // If not a perfect match, try different key derivations
  console.log('\n--- Trying different key formulas ---');
  
  // Maybe the key is derived from WHAT header differently
  // Try: key[i] = WHAT[(i + offset) % 32]
  for (let offset = 0; offset < 32; offset++) {
    const testXor = new Uint8Array(sample1.data.length);
    for (let i = 0; i < sample1.data.length; i++) {
      testXor[i] = what1[(i + offset) % what1.length] ^ what2[(i + offset) % what2.length];
    }
    
    let matches = 0;
    for (let i = 0; i < sample1.data.length; i++) {
      if (dataXor[i] === testXor[i]) matches++;
    }
    
    if (matches > matchCount) {
      console.log(`Offset ${offset}: ${matches} matches`);
    }
    
    if (matches === sample1.data.length) {
      console.log(`\n*** FOUND IT! Offset ${offset} works! ***`);
      
      const decoded = new Uint8Array(sample1.data.length);
      for (let i = 0; i < sample1.data.length; i++) {
        decoded[i] = sample1.data[i] ^ what1[(i + offset) % what1.length];
      }
      console.log('Decoded URL:', new TextDecoder().decode(decoded));
      return new TextDecoder().decode(decoded);
    }
  }
  
  // Try: key might skip the "ISEEYO" prefix (first 7 chars)
  console.log('\n--- Trying with WHAT prefix stripped ---');
  const what1Stripped = sample1.whatHeader.substring(7); // Remove "ISEEYO" + one more char
  const what2Stripped = sample2.whatHeader.substring(7);
  const what1StrippedBytes = new TextEncoder().encode(what1Stripped);
  const what2StrippedBytes = new TextEncoder().encode(what2Stripped);
  
  console.log('Stripped WHAT 1:', what1Stripped, '(length:', what1Stripped.length, ')');
  console.log('Stripped WHAT 2:', what2Stripped);
  
  const strippedXor = new Uint8Array(sample1.data.length);
  for (let i = 0; i < sample1.data.length; i++) {
    strippedXor[i] = what1StrippedBytes[i % what1StrippedBytes.length] ^ what2StrippedBytes[i % what2StrippedBytes.length];
  }
  
  let strippedMatches = 0;
  for (let i = 0; i < sample1.data.length; i++) {
    if (dataXor[i] === strippedXor[i]) strippedMatches++;
  }
  console.log(`Stripped key matches: ${strippedMatches} / ${sample1.data.length}`);
  
  if (strippedMatches === sample1.data.length) {
    console.log('\n*** FOUND IT! Stripped WHAT header works! ***');
    
    const decoded = new Uint8Array(sample1.data.length);
    for (let i = 0; i < sample1.data.length; i++) {
      decoded[i] = sample1.data[i] ^ what1StrippedBytes[i % what1StrippedBytes.length];
    }
    console.log('Decoded URL:', new TextDecoder().decode(decoded));
    return new TextDecoder().decode(decoded);
  }
  
  // Try different strip lengths
  for (let stripLen = 0; stripLen <= 10; stripLen++) {
    const w1 = new TextEncoder().encode(sample1.whatHeader.substring(stripLen));
    const w2 = new TextEncoder().encode(sample2.whatHeader.substring(stripLen));
    
    if (w1.length === 0) continue;
    
    const testXor = new Uint8Array(sample1.data.length);
    for (let i = 0; i < sample1.data.length; i++) {
      testXor[i] = w1[i % w1.length] ^ w2[i % w2.length];
    }
    
    let matches = 0;
    for (let i = 0; i < sample1.data.length; i++) {
      if (dataXor[i] === testXor[i]) matches++;
    }
    
    if (matches > 100) {
      console.log(`Strip ${stripLen} chars: ${matches} matches (key length: ${w1.length})`);
    }
  }
  
  // Maybe the key uses a different part of WHAT header
  // Try: key = WHAT[7:] (after "ISEEYO" + first char)
  console.log('\n--- Analyzing position-by-position ---');
  
  // For each position, find what key byte would make the XORs match
  const derivedKey1: number[] = [];
  const derivedKey2: number[] = [];
  
  for (let i = 0; i < Math.min(32, sample1.data.length); i++) {
    // We need: data1[i] ^ key1[?] = data2[i] ^ key2[?]
    // So: data1[i] ^ data2[i] = key1[?] ^ key2[?]
    const dataXorByte = sample1.data[i] ^ sample2.data[i];
    
    // Find which position in WHAT headers gives this XOR
    for (let j = 0; j < 32; j++) {
      if ((what1[j] ^ what2[j]) === dataXorByte) {
        console.log(`Position ${i}: key position ${j} works (WHAT[${j}] = '${sample1.whatHeader[j]}')`);
        derivedKey1.push(what1[j]);
        derivedKey2.push(what2[j]);
        break;
      }
    }
  }
  
  return null;
}

crackWithMultipleSamples().catch(console.error);
