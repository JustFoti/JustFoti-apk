#!/usr/bin/env bun
/**
 * The /fetch endpoint uses protobuf encoding
 * Format: \n{len}{source}\x12{len}{id}\x1a{len}{streamNo}
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

function encodeProtobuf(source: string, id: string, streamNo: string): Uint8Array {
  // Protobuf wire format:
  // Field 1 (source): tag=0x0a (field 1, wire type 2=length-delimited), then length, then bytes
  // Field 2 (id): tag=0x12 (field 2, wire type 2), then length, then bytes
  // Field 3 (streamNo): tag=0x1a (field 3, wire type 2), then length, then bytes
  
  const sourceBytes = new TextEncoder().encode(source);
  const idBytes = new TextEncoder().encode(id);
  const streamNoBytes = new TextEncoder().encode(streamNo);
  
  const result: number[] = [];
  
  // Field 1: source
  result.push(0x0a); // tag
  result.push(sourceBytes.length); // length
  result.push(...sourceBytes);
  
  // Field 2: id
  result.push(0x12); // tag
  result.push(idBytes.length); // length
  result.push(...idBytes);
  
  // Field 3: streamNo
  result.push(0x1a); // tag
  result.push(streamNoBytes.length); // length
  result.push(...streamNoBytes);
  
  return new Uint8Array(result);
}

function decodeResponse(bytes: Uint8Array, key: string): string {
  // XOR decode with the WHAT header key
  const keyBytes = new TextEncoder().encode(key);
  const decoded = new Uint8Array(bytes.length);
  
  for (let i = 0; i < bytes.length; i++) {
    decoded[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return new TextDecoder('utf-8', { fatal: false }).decode(decoded);
}

async function fetchStreamUrl(source: string, id: string, streamNo: string) {
  console.log(`=== Fetching stream URL for ${source}/${id}/${streamNo} ===`);
  
  const body = encodeProtobuf(source, id, streamNo);
  console.log('Encoded body:', Array.from(body));
  console.log('Body as string:', new TextDecoder().decode(body));
  
  const headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/octet-stream',
    'origin': 'https://embedsports.top',
    'referer': `https://embedsports.top/embed/${source}/${id}/${streamNo}`,
    'sec-ch-ua': '"Chromium";v="143", "Not A(Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': USER_AGENT,
  };
  
  try {
    const res = await fetch('https://embedsports.top/fetch', {
      method: 'POST',
      headers,
      body,
    });
    
    console.log('\nResponse status:', res.status);
    
    const whatHeader = res.headers.get('what');
    console.log('WHAT header:', whatHeader);
    
    if (res.ok && whatHeader) {
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      console.log('Response length:', bytes.length);
      
      // Decode with XOR
      const decoded = decodeResponse(bytes, whatHeader);
      console.log('\nDecoded response:', decoded);
      
      // Extract URL
      const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+/);
      if (urlMatch) {
        console.log('\n*** STREAM URL ***');
        console.log(urlMatch[0]);
        return urlMatch[0];
      }
    } else {
      const text = await res.text();
      console.log('Error response:', text);
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
  
  return null;
}

async function testMultipleStreams() {
  console.log('\n\n=== Testing multiple streams ===\n');
  
  const tests = [
    { source: 'charlie', id: 'final-1629472869', streamNo: '1' },
    { source: 'echo', id: 'final-1629472869', streamNo: '1' },
  ];
  
  for (const test of tests) {
    const url = await fetchStreamUrl(test.source, test.id, test.streamNo);
    console.log(`\n${test.source}/${test.id}/${test.streamNo} => ${url || 'FAILED'}\n`);
    console.log('---');
  }
}

// Run
testMultipleStreams().catch(console.error);
