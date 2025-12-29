#!/usr/bin/env bun
/**
 * Test the streamed.pk m3u8 extraction with a live stream
 */

const EMBED_BASE = 'https://embedsports.top';

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
  
  // Step 1: Make the /fetch request
  const body = `${source}${id}${streamNo}`;
  console.log('\nRequest body:', body);
  console.log('Body length:', body.length);
  
  const response = await fetch(`${EMBED_BASE}/fetch`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/octet-stream',
      'Origin': EMBED_BASE,
      'Referer': `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`,
    },
    body,
  });

  console.log('\nResponse status:', response.status);
  console.log('Response headers:');
  response.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
  
  const whatHeader = response.headers.get('what');
  console.log('\nWHAT header:', whatHeader);
  
  if (!response.ok) {
    const text = await response.text();
    console.log('Error response:', text);
    return;
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  console.log('\nResponse length:', bytes.length, 'bytes');
  console.log('Raw bytes:', Array.from(bytes));
  console.log('As hex:', Buffer.from(bytes).toString('hex'));
  
  if (!whatHeader) {
    console.log('No WHAT header');
    return;
  }
  
  // Try XOR decode
  const decoded = xorDecode(bytes, whatHeader);
  console.log('\nXOR decoded result:');
  console.log(decoded);
  
  // Check if it contains a URL
  const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+/);
  if (urlMatch) {
    console.log('\n*** Found URL:', urlMatch[0]);
  }
  
  // Try different decoding approaches
  console.log('\n--- Trying different approaches ---');
  
  // Maybe the response is already the URL in some encoding
  const asUtf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  console.log('As UTF-8:', asUtf8);
  
  // Try base64
  try {
    const asBase64 = Buffer.from(bytes).toString('base64');
    console.log('As Base64:', asBase64);
    
    // Try decoding the UTF-8 as base64
    const fromBase64 = Buffer.from(asUtf8, 'base64').toString('utf-8');
    console.log('UTF-8 decoded as Base64:', fromBase64);
  } catch (e) {
    console.log('Base64 decode failed');
  }
  
  // Try constructing URL directly with WHAT header as token
  console.log('\n--- Testing constructed URLs ---');
  
  for (const lb of [1, 2, 3, 4, 5]) {
    const url = `https://lb${lb}.strmd.top/secure/${whatHeader}/${source}/stream/${id}/${streamNo}/playlist.m3u8`;
    
    try {
      const testRes = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `${EMBED_BASE}/`,
        },
      });
      console.log(`lb${lb}: ${testRes.status} ${testRes.statusText}`);
      
      if (testRes.ok) {
        console.log('\n*** WORKING URL:', url);
        return;
      }
    } catch (e: any) {
      console.log(`lb${lb}: Error - ${e.message}`);
    }
  }
}

testExtraction().catch(console.error);
