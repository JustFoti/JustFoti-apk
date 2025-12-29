#!/usr/bin/env bun
/**
 * Test the streamed.pk m3u8 extraction
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
  const source = 'charlie';
  const id = 'final-1629472869';
  const streamNo = '1';
  
  console.log(`Testing extraction for ${source}/${id}/${streamNo}`);
  console.log('='.repeat(60));
  
  // Step 1: Make the /fetch request
  const body = `${source}${id}${streamNo}`;
  console.log('\nRequest body:', body);
  
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
  
  const whatHeader = response.headers.get('what');
  console.log('WHAT header:', whatHeader);
  
  if (!response.ok || !whatHeader) {
    console.log('Failed to get response');
    return;
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  console.log('\nResponse length:', bytes.length, 'bytes');
  console.log('First 30 bytes:', Array.from(bytes.slice(0, 30)));
  
  // Try XOR decode
  const decoded = xorDecode(bytes, whatHeader);
  console.log('\nXOR decoded result:');
  console.log(decoded);
  
  // Check if it contains a URL
  const urlMatch = decoded.match(/https?:\/\/[^\s"'<>]+/);
  if (urlMatch) {
    console.log('\n*** Found URL:', urlMatch[0]);
  }
  
  // Try different XOR variations
  console.log('\n--- Trying variations ---');
  
  // Reversed key
  const reversedKey = whatHeader.split('').reverse().join('');
  const decodedReversed = xorDecode(bytes, reversedKey);
  console.log('Reversed key:', decodedReversed.substring(0, 100));
  
  // First 8 chars of key
  const shortKey = whatHeader.substring(0, 8);
  const decodedShort = xorDecode(bytes, shortKey);
  console.log('Short key (8 chars):', decodedShort.substring(0, 100));
  
  // Try to find patterns
  console.log('\n--- Looking for patterns ---');
  
  // The URL should contain these strings
  const patterns = ['https', 'strmd', 'lb', 'secure', 'playlist', 'm3u8'];
  
  for (const pattern of patterns) {
    const patternBytes = new TextEncoder().encode(pattern);
    
    // Search for where this pattern might be in the response
    for (let offset = 0; offset < bytes.length - patternBytes.length; offset++) {
      // Calculate what XOR key would produce this pattern
      let possibleKey = '';
      let valid = true;
      
      for (let i = 0; i < patternBytes.length && valid; i++) {
        const keyByte = bytes[offset + i] ^ patternBytes[i];
        if (keyByte >= 32 && keyByte <= 126) {
          possibleKey += String.fromCharCode(keyByte);
        } else {
          valid = false;
        }
      }
      
      if (valid) {
        // Check if this key is part of the WHAT header
        if (whatHeader.includes(possibleKey) || possibleKey.length >= 4) {
          console.log(`Pattern "${pattern}" at offset ${offset}, key fragment: "${possibleKey}"`);
        }
      }
    }
  }
  
  // Try constructing URL directly
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
      }
    } catch (e: any) {
      console.log(`lb${lb}: Error - ${e.message}`);
    }
  }
}

testExtraction().catch(console.error);
