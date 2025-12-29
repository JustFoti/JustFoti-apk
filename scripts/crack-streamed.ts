#!/usr/bin/env bun
/**
 * Crack the streamed.pk decoding algorithm
 * 
 * From Puppeteer capture:
 * - WHAT header: ISEEYOUoemUmptlEkDUFxTUaSdtclpgz (32 chars)
 * - Token in URL: qhJmEYWJflSuhezjUBQwkrtflIFqyeYo (32 chars)
 * - Response: 191 bytes (protobuf: 0x0a + varint(188) + 188 bytes data)
 * 
 * The token must be decoded from the 188 byte data using the WHAT header
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

// The full URL is ~150 chars:
// https://lb5.strmd.top/secure/{32-char-token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
// But response data is 188 bytes - so it's the full URL encoded

async function crackDecoding() {
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
  console.log('Fetching fresh response...\n');
  
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
  
  // Skip protobuf header
  let idx = 1;
  while (idx < bytes.length && (bytes[idx] & 0x80) !== 0) idx++;
  idx++;
  
  const data = bytes.slice(idx);
  console.log('Data length:', data.length);
  
  // The expected URL format:
  // https://lb{N}.strmd.top/secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  const expectedPrefix = 'https://lb';
  const expectedSuffix = `/charlie/stream/${id}/${streamNo}/playlist.m3u8`;
  
  console.log('\nExpected URL structure:');
  console.log('  Prefix: https://lb{1-5}.strmd.top/secure/');
  console.log('  Token: 32 chars');
  console.log('  Suffix:', expectedSuffix);
  console.log('  Total expected length:', 'https://lb5.strmd.top/secure/'.length + 32 + expectedSuffix.length);
  
  // The data is 188 bytes, URL is ~150 chars
  // So there might be padding or the encoding adds bytes
  
  // Key insight: "ISEEYO" prefix in WHAT header might be a marker
  // The actual key might be the remaining 26 chars: "UoemUmptlEkDUFxTUaSdtclpgz"
  
  const keyVariants = [
    { name: 'full WHAT', key: whatHeader },
    { name: 'without ISEEYO', key: whatHeader.slice(6) },
    { name: 'without ISEEYOU', key: whatHeader.slice(7) },
    { name: 'reversed', key: whatHeader.split('').reverse().join('') },
  ];
  
  console.log('\n--- Testing XOR with key variants ---');
  
  for (const { name, key } of keyVariants) {
    const keyBytes = new TextEncoder().encode(key);
    const decoded = new Uint8Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      decoded[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    
    const result = new TextDecoder('utf-8', { fatal: false }).decode(decoded);
    
    if (result.includes('http') || result.includes('strmd') || result.includes('lb')) {
      console.log(`\n*** ${name} (${key.length} chars):`);
      console.log(result);
    }
  }
  
  // Try to find where "https" would be in the data
  console.log('\n--- Searching for "https" position ---');
  
  const httpsBytes = new TextEncoder().encode('https');
  const keyBytes = new TextEncoder().encode(whatHeader);
  
  for (let dataOffset = 0; dataOffset < Math.min(50, data.length); dataOffset++) {
    // For each position in data, calculate what key offset would produce "https"
    let keyOffset = -1;
    
    for (let ko = 0; ko < keyBytes.length; ko++) {
      let matches = true;
      for (let i = 0; i < httpsBytes.length && matches; i++) {
        const expectedKeyByte = data[dataOffset + i] ^ httpsBytes[i];
        if (expectedKeyByte !== keyBytes[(ko + i) % keyBytes.length]) {
          matches = false;
        }
      }
      if (matches) {
        keyOffset = ko;
        break;
      }
    }
    
    if (keyOffset >= 0) {
      console.log(`Found "https" at data offset ${dataOffset} with key offset ${keyOffset}`);
      
      // Decode the full data with this alignment
      const decoded = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        decoded[i] = data[i] ^ keyBytes[(keyOffset + i) % keyBytes.length];
      }
      const result = new TextDecoder('utf-8', { fatal: false }).decode(decoded);
      console.log('Decoded:', result);
      
      const urlMatch = result.match(/https?:\/\/[^\s\x00-\x1f]+/);
      if (urlMatch) {
        console.log('\n*** FOUND URL:', urlMatch[0]);
        
        // Verify the URL works
        try {
          const testRes = await fetch(urlMatch[0], {
            method: 'HEAD',
            headers: { 'Referer': `${EMBED_BASE}/` },
          });
          console.log('URL status:', testRes.status);
        } catch (e: any) {
          console.log('URL test error:', e.message);
        }
        
        return urlMatch[0];
      }
    }
  }
  
  // Alternative: The response might not be XOR at all
  // Let's check if it's some other encoding
  console.log('\n--- Checking other encodings ---');
  
  // Check if data contains printable ASCII after some transformation
  const printableCount = Array.from(data).filter(b => b >= 32 && b <= 126).length;
  console.log('Printable ASCII bytes:', printableCount, '/', data.length);
  
  // Check byte distribution
  const byteFreq: Record<number, number> = {};
  for (const b of data) {
    byteFreq[b] = (byteFreq[b] || 0) + 1;
  }
  const uniqueBytes = Object.keys(byteFreq).length;
  console.log('Unique byte values:', uniqueBytes);
  
  // If mostly printable, it might be a simple substitution cipher
  if (printableCount > data.length * 0.8) {
    console.log('Data is mostly printable - might be substitution cipher');
    console.log('Raw data as string:', new TextDecoder('utf-8', { fatal: false }).decode(data));
  }
  
  return null;
}

crackDecoding().catch(console.error);
