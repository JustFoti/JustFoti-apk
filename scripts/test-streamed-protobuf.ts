#!/usr/bin/env bun
/**
 * Test the streamed.pk m3u8 extraction with protobuf encoding
 * 
 * The /fetch endpoint expects protobuf-encoded body:
 * Field 1 (source): tag=0x0a, length, bytes
 * Field 2 (id): tag=0x12, length, bytes  
 * Field 3 (streamNo): tag=0x1a, length, bytes
 */

const EMBED_BASE = 'https://embedsports.top';

function encodeProtobuf(source: string, id: string, streamNo: string): Uint8Array {
  const sourceBytes = new TextEncoder().encode(source);
  const idBytes = new TextEncoder().encode(id);
  const streamNoBytes = new TextEncoder().encode(streamNo);
  
  const result: number[] = [];
  
  // Field 1: source (tag 0x0a = field 1, wire type 2)
  result.push(0x0a);
  result.push(sourceBytes.length);
  result.push(...sourceBytes);
  
  // Field 2: id (tag 0x12 = field 2, wire type 2)
  result.push(0x12);
  result.push(idBytes.length);
  result.push(...idBytes);
  
  // Field 3: streamNo (tag 0x1a = field 3, wire type 2)
  result.push(0x1a);
  result.push(streamNoBytes.length);
  result.push(...streamNoBytes);
  
  return new Uint8Array(result);
}

function xorDecode(bytes: Uint8Array, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const decoded = new Uint8Array(bytes.length);
  
  for (let i = 0; i < bytes.length; i++) {
    decoded[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return new TextDecoder('utf-8', { fatal: false }).decode(decoded);
}

async function testExtraction() {
  // Use a live stream
  const source = 'charlie';
  const id = 'wellington-firebirds-vs-auckland-aces-1629472738';
  const streamNo = '1';
  
  console.log(`Testing extraction for ${source}/${id}/${streamNo}`);
  console.log('='.repeat(60));
  
  // Try protobuf encoding
  const protoBody = encodeProtobuf(source, id, streamNo);
  console.log('\nProtobuf body:', Array.from(protoBody));
  console.log('Protobuf as string:', new TextDecoder().decode(protoBody));
  
  // Also try plain text body
  const plainBody = `${source}${id}${streamNo}`;
  console.log('\nPlain body:', plainBody);
  
  // Test with protobuf
  console.log('\n--- Testing with protobuf body ---');
  let response = await fetch(`${EMBED_BASE}/fetch`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Content-Type': 'application/octet-stream',
      'Origin': EMBED_BASE,
      'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
    },
    body: protoBody,
  });

  console.log('Status:', response.status);
  let whatHeader = response.headers.get('what');
  console.log('WHAT header:', whatHeader);
  
  if (response.ok && whatHeader) {
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    console.log('Response length:', bytes.length);
    console.log('Raw bytes:', Array.from(bytes));
    
    const decoded = xorDecode(bytes, whatHeader);
    console.log('XOR decoded:', decoded);
    
    const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+/);
    if (urlMatch) {
      console.log('\n*** Found URL:', urlMatch[0]);
      return;
    }
  } else {
    const text = await response.text();
    console.log('Error:', text);
  }
  
  // Test with different body formats
  const bodyFormats = [
    { name: 'newline separated', body: `${source}\n${id}\n${streamNo}` },
    { name: 'pipe separated', body: `${source}|${id}|${streamNo}` },
    { name: 'slash separated', body: `${source}/${id}/${streamNo}` },
    { name: 'JSON', body: JSON.stringify({ source, id, streamNo }) },
    { name: 'JSON array', body: JSON.stringify([source, id, streamNo]) },
  ];
  
  for (const format of bodyFormats) {
    console.log(`\n--- Testing with ${format.name} ---`);
    console.log('Body:', format.body);
    
    response = await fetch(`${EMBED_BASE}/fetch`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Content-Type': format.name === 'JSON' || format.name === 'JSON array' ? 'application/json' : 'application/octet-stream',
        'Origin': EMBED_BASE,
        'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
      },
      body: format.body,
    });

    console.log('Status:', response.status);
    whatHeader = response.headers.get('what');
    console.log('WHAT header:', whatHeader);
    
    if (response.ok && whatHeader) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      console.log('Response length:', bytes.length);
      
      const decoded = xorDecode(bytes, whatHeader);
      console.log('XOR decoded:', decoded.substring(0, 200));
      
      const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+/);
      if (urlMatch) {
        console.log('\n*** Found URL:', urlMatch[0]);
        return;
      }
    } else {
      const text = await response.text();
      console.log('Error:', text.substring(0, 100));
    }
  }
}

testExtraction().catch(console.error);
