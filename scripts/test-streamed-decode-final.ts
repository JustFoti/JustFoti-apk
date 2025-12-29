#!/usr/bin/env bun
/**
 * Final attempt to decode the /fetch response
 * 
 * We know:
 * - WHAT header: ISEEYOUoemUmptlEkDUFxTUaSdtclpgz (32 chars)
 * - Token in URL: qhJmEYWJflSuhezjUBQwkrtflIFqyeYo (32 chars)
 * - Response is protobuf with 188 bytes of data
 * 
 * The token must be extracted from the response body using the WHAT header
 */

const EMBED_BASE = 'https://embedsports.top';

function encodeProtobuf(source: string, id: string, streamNo: string): Uint8Array {
  const sourceBytes = new TextEncoder().encode(source);
  const idBytes = new TextEncoder().encode(id);
  const streamNoBytes = new TextEncoder().encode(streamNo);
  
  const result: number[] = [];
  
  result.push(0x0a);
  result.push(sourceBytes.length);
  result.push(...sourceBytes);
  
  result.push(0x12);
  result.push(idBytes.length);
  result.push(...idBytes);
  
  result.push(0x1a);
  result.push(streamNoBytes.length);
  result.push(...streamNoBytes);
  
  return new Uint8Array(result);
}

async function decodeResponse() {
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
  console.log('Fetching stream data...');
  
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

  const whatHeader = response.headers.get('what')!;
  console.log('WHAT header:', whatHeader);
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Skip protobuf header (0x0a + varint length)
  // First byte is 0x0a (tag), then varint for length
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++; // Skip the last byte of varint
  
  const data = bytes.slice(idx);
  console.log('Data length:', data.length);
  console.log('Data bytes:', Array.from(data.slice(0, 50)));
  
  // The expected URL is:
  // https://lb{N}.strmd.top/secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  // We need to find the token (32 chars) in the decoded data
  
  // Try different decoding methods
  console.log('\n--- Trying different decoding methods ---');
  
  const keyBytes = new TextEncoder().encode(whatHeader);
  
  // Method 1: Simple XOR
  const xor1 = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    xor1[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  console.log('XOR:', new TextDecoder('utf-8', { fatal: false }).decode(xor1).substring(0, 100));
  
  // Method 2: XOR with key offset by position
  const xor2 = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    xor2[i] = data[i] ^ keyBytes[(i + 1) % keyBytes.length];
  }
  console.log('XOR offset 1:', new TextDecoder('utf-8', { fatal: false }).decode(xor2).substring(0, 100));
  
  // Method 3: The response might contain the full URL, not just the token
  // Let's look for "https" pattern
  const httpsBytes = new TextEncoder().encode('https');
  
  for (let offset = 0; offset < data.length - httpsBytes.length; offset++) {
    // Calculate what XOR key would produce "https" at this offset
    let possibleKey = '';
    for (let i = 0; i < httpsBytes.length; i++) {
      possibleKey += String.fromCharCode(data[offset + i] ^ httpsBytes[i]);
    }
    
    // Check if this key fragment matches part of the WHAT header
    if (whatHeader.includes(possibleKey)) {
      console.log(`Found "https" at offset ${offset} with key fragment "${possibleKey}"`);
      
      // Try to decode the full URL using this key alignment
      const keyOffset = whatHeader.indexOf(possibleKey);
      const decoded = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        const keyIdx = (i - offset + keyOffset + keyBytes.length * 100) % keyBytes.length;
        decoded[i] = data[i] ^ keyBytes[keyIdx];
      }
      const result = new TextDecoder('utf-8', { fatal: false }).decode(decoded);
      console.log('Decoded:', result.substring(0, 200));
      
      const urlMatch = result.match(/https?:\/\/[^\s"'<>]+/);
      if (urlMatch) {
        console.log('\n*** Found URL:', urlMatch[0]);
        return urlMatch[0];
      }
    }
  }
  
  // Method 4: Maybe the data is the URL directly encoded
  // The URL should be ~120 chars: https://lb5.strmd.top/secure/{32}/charlie/stream/{48}/1/playlist.m3u8
  // But data is 188 bytes, so there might be padding or extra data
  
  // Let's try to find the lb number
  for (let lb = 1; lb <= 5; lb++) {
    const lbStr = `lb${lb}`;
    const lbBytes = new TextEncoder().encode(lbStr);
    
    for (let offset = 0; offset < data.length - lbBytes.length; offset++) {
      let possibleKey = '';
      let valid = true;
      for (let i = 0; i < lbBytes.length && valid; i++) {
        const keyByte = data[offset + i] ^ lbBytes[i];
        if (keyByte >= 32 && keyByte <= 126) {
          possibleKey += String.fromCharCode(keyByte);
        } else {
          valid = false;
        }
      }
      
      if (valid && whatHeader.includes(possibleKey)) {
        console.log(`Found "${lbStr}" at offset ${offset} with key fragment "${possibleKey}"`);
      }
    }
  }
  
  // Method 5: The response might be AES encrypted, not XOR
  // Let's check if the data looks like AES ciphertext
  console.log('\n--- Checking for AES encryption ---');
  console.log('Data is multiple of 16:', data.length % 16 === 0);
  
  // Method 6: Try base64 decoding first
  console.log('\n--- Trying base64 ---');
  const asUtf8 = new TextDecoder('utf-8', { fatal: false }).decode(data);
  try {
    const fromBase64 = Buffer.from(asUtf8, 'base64').toString('utf-8');
    console.log('Base64 decoded:', fromBase64.substring(0, 100));
  } catch {
    console.log('Not valid base64');
  }
  
  // Method 7: The WHAT header might be used differently
  // "ISEEYO" prefix suggests it's a marker, the actual key might be the rest
  const keyWithoutPrefix = whatHeader.replace('ISEEYO', '');
  console.log('\nKey without ISEEYO prefix:', keyWithoutPrefix);
  
  const keyBytes2 = new TextEncoder().encode(keyWithoutPrefix);
  const xor3 = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    xor3[i] = data[i] ^ keyBytes2[i % keyBytes2.length];
  }
  console.log('XOR without prefix:', new TextDecoder('utf-8', { fatal: false }).decode(xor3).substring(0, 100));
  
  return null;
}

decodeResponse().catch(console.error);
