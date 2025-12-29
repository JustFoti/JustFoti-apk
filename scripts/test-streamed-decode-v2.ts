#!/usr/bin/env bun
/**
 * Analyze the /fetch response decoding more carefully
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

async function analyzeResponse() {
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
  console.log('WHAT length:', whatHeader.length);
  
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  console.log('Response length:', bytes.length);
  
  // The response starts with 0x0a which is protobuf field 1 tag
  // Then 0xbc 0x01 which is varint 188 (length)
  // So the response is also protobuf encoded!
  
  console.log('\n--- Analyzing protobuf structure ---');
  console.log('First byte (tag):', bytes[0].toString(16)); // 0x0a = field 1, wire type 2
  
  // Decode varint for length
  let length = 0;
  let shift = 0;
  let idx = 1;
  while (idx < bytes.length) {
    const b = bytes[idx];
    length |= (b & 0x7f) << shift;
    idx++;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  console.log('Length varint:', length);
  console.log('Data starts at index:', idx);
  
  // Extract the data portion
  const data = bytes.slice(idx, idx + length);
  console.log('Data length:', data.length);
  console.log('Data bytes:', Array.from(data.slice(0, 50)));
  
  // The data is XOR encoded with the WHAT header
  const keyBytes = new TextEncoder().encode(whatHeader);
  const decoded = new Uint8Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    decoded[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  
  const decodedStr = new TextDecoder('utf-8', { fatal: false }).decode(decoded);
  console.log('\nXOR decoded data:');
  console.log(decodedStr);
  
  // Check if it's a URL
  const urlMatch = decodedStr.match(/https?:\/\/[^\s"'<>]+/);
  if (urlMatch) {
    console.log('\n*** Found URL:', urlMatch[0]);
  }
  
  // Try different XOR approaches
  console.log('\n--- Trying different XOR approaches ---');
  
  // Maybe XOR the whole response, not just the data
  const fullDecoded = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    fullDecoded[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  console.log('Full XOR:', new TextDecoder('utf-8', { fatal: false }).decode(fullDecoded));
  
  // Maybe the key needs to be used differently
  // Try XOR with key starting from different offsets
  for (let offset = 0; offset < Math.min(10, whatHeader.length); offset++) {
    const offsetKey = whatHeader.slice(offset) + whatHeader.slice(0, offset);
    const offsetKeyBytes = new TextEncoder().encode(offsetKey);
    const offsetDecoded = new Uint8Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      offsetDecoded[i] = data[i] ^ offsetKeyBytes[i % offsetKeyBytes.length];
    }
    
    const result = new TextDecoder('utf-8', { fatal: false }).decode(offsetDecoded);
    if (result.includes('http') || result.includes('strmd') || result.includes('lb')) {
      console.log(`Offset ${offset}:`, result.substring(0, 100));
    }
  }
  
  // The expected URL format is:
  // https://lb{N}.strmd.top/secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
  // Let's see if we can find the token in the decoded data
  
  console.log('\n--- Looking for URL components ---');
  
  // The decoded data might be the token itself
  // Let's try constructing the URL with different parts of the decoded data
  const cleanDecoded = decodedStr.replace(/[^\x20-\x7E]/g, '');
  console.log('Clean decoded:', cleanDecoded);
  
  // Try using parts of the decoded string as the token
  const possibleTokens = [
    cleanDecoded,
    cleanDecoded.replace(/\s/g, ''),
    whatHeader,
  ];
  
  for (const token of possibleTokens) {
    if (!token || token.length < 10) continue;
    
    for (const lb of [1, 2, 3, 4, 5]) {
      const url = `https://lb${lb}.strmd.top/secure/${token}/${source}/stream/${id}/${streamNo}/playlist.m3u8`;
      
      try {
        const testRes = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': `${EMBED_BASE}/`,
          },
        });
        
        if (testRes.ok) {
          console.log(`\n*** WORKING URL (lb${lb}, token=${token.substring(0, 20)}...):`);
          console.log(url);
          return;
        }
      } catch {}
    }
  }
  
  console.log('\nNo working URL found');
}

analyzeResponse().catch(console.error);
