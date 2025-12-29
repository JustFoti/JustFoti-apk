#!/usr/bin/env bun
/**
 * Test the /fetch endpoint directly
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

async function testFetch() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const protoBody = encodeProtobuf(source, id, streamNo);
  console.log('Proto body:', Array.from(protoBody));
  
  try {
    const response = await fetch(`${EMBED_BASE}/fetch`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/octet-stream',
        'Origin': EMBED_BASE,
        'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: protoBody,
    });

    console.log('Status:', response.status);
    console.log('Status text:', response.statusText);
    console.log('Headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    const whatHeader = response.headers.get('what');
    console.log('\nWHAT header:', whatHeader);
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      console.log('Response bytes:', bytes.length);
      console.log('First 50 bytes:', Array.from(bytes.slice(0, 50)));
      console.log('As string:', new TextDecoder().decode(bytes).substring(0, 100));
    } else {
      const text = await response.text();
      console.log('Error response:', text);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testFetch();
