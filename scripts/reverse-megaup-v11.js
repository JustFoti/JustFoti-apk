#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v11
 * 
 * Let's try to understand the encryption by looking at the relationship
 * between encrypted and decrypted bytes more carefully.
 * 
 * Key observation: encrypted is 717 bytes, decrypted is 521 bytes
 * Ratio: 717/521 = 1.376
 * 
 * This could mean:
 * 1. There's a 196-byte header/footer
 * 2. The encryption expands the data somehow
 * 3. There's padding
 */

const crypto = require('crypto');

const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
const baseUrl = 'https://megaup22.online';
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  // Fetch encrypted data
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  // Get decrypted
  const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent: ua }),
  });
  const decResult = await decResponse.json();
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  console.log('Encrypted bytes:', encBytes.length);
  console.log('Decrypted bytes:', decBytes.length);
  console.log('Difference:', encBytes.length - decBytes.length);
  
  // The difference is 196 bytes
  // Let's see if removing a header/footer helps
  
  console.log('\n--- Testing header/footer removal ---');
  
  // Try removing first N bytes
  for (const headerSize of [0, 16, 32, 64, 128, 196]) {
    const trimmed = encBytes.slice(headerSize);
    if (trimmed.length === decBytes.length) {
      console.log(`Header size ${headerSize}: lengths match!`);
      
      // Check if it's a simple XOR
      const keystream = [];
      for (let i = 0; i < decBytes.length; i++) {
        keystream.push(trimmed[i] ^ decBytes[i]);
      }
      
      // Check if keystream is constant
      const uniqueBytes = [...new Set(keystream)];
      console.log(`  Unique keystream bytes: ${uniqueBytes.length}`);
      
      if (uniqueBytes.length === 1) {
        console.log(`  Constant XOR key: ${uniqueBytes[0]}`);
      }
    }
  }
  
  // Try removing last N bytes
  for (const footerSize of [0, 16, 32, 64, 128, 196]) {
    const trimmed = encBytes.slice(0, -footerSize || encBytes.length);
    if (trimmed.length === decBytes.length) {
      console.log(`Footer size ${footerSize}: lengths match!`);
    }
  }
  
  // Try removing both header and footer
  for (const headerSize of [0, 16, 32, 64, 96, 128]) {
    for (const footerSize of [0, 16, 32, 64, 96, 128]) {
      if (headerSize + footerSize === 0) continue;
      const trimmed = encBytes.slice(headerSize, -footerSize || encBytes.length);
      if (trimmed.length === decBytes.length) {
        console.log(`Header ${headerSize} + Footer ${footerSize}: lengths match!`);
      }
    }
  }
  
  // The encrypted data might be in a different format
  // Let's check if it's hex-encoded or something
  
  console.log('\n--- Checking data format ---');
  
  // Check if encrypted is hex
  const hexDecoded = Buffer.from(encrypted, 'hex');
  console.log('Hex decode length:', hexDecoded.length);
  
  // Check if there's a pattern in the encrypted data
  console.log('\n--- Analyzing encrypted data patterns ---');
  
  // Check byte frequency
  const histogram = new Array(256).fill(0);
  for (const byte of encBytes) {
    histogram[byte]++;
  }
  
  const topBytes = histogram.map((count, byte) => ({ byte, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  console.log('Most common encrypted bytes:', topBytes.map(b => `${b.byte.toString(16).padStart(2, '0')}:${b.count}`).join(', '));
  
  // Check if there's a repeating pattern
  console.log('\n--- Checking for repeating patterns ---');
  
  for (const period of [4, 8, 16, 32]) {
    let matches = 0;
    for (let i = period; i < encBytes.length; i++) {
      if (encBytes[i] === encBytes[i - period]) matches++;
    }
    console.log(`Period ${period}: ${matches}/${encBytes.length - period} matches`);
  }
  
  // Let's try to understand the relationship by looking at specific positions
  console.log('\n--- Byte-by-byte analysis ---');
  
  // The decrypted starts with '{"sources"'
  const expectedStart = '{"sources":[{"file":"https://';
  console.log('Expected start:', expectedStart);
  console.log('Expected bytes:', Buffer.from(expectedStart).toString('hex'));
  console.log('Encrypted start:', encBytes.slice(0, expectedStart.length).toString('hex'));
  
  // XOR to find keystream
  const keystream = [];
  for (let i = 0; i < expectedStart.length; i++) {
    keystream.push(encBytes[i] ^ expectedStart.charCodeAt(i));
  }
  console.log('Keystream start:', Buffer.from(keystream).toString('hex'));
  
  // Check if keystream matches UA in some way
  console.log('\nUA bytes:', Buffer.from(ua.slice(0, 30)).toString('hex'));
  
  // Try to find if keystream is derived from UA
  const uaBytes = Buffer.from(ua);
  let uaMatches = 0;
  for (let i = 0; i < keystream.length; i++) {
    if (keystream[i] === uaBytes[i % uaBytes.length]) uaMatches++;
  }
  console.log(`Keystream matches UA: ${uaMatches}/${keystream.length}`);
  
  // Try XOR with position
  const posXor = keystream.map((k, i) => k ^ i);
  console.log('Keystream XOR position:', Buffer.from(posXor).toString('hex'));
  
  // Try XOR with UA and position
  const uaPosXor = keystream.map((k, i) => k ^ uaBytes[i % uaBytes.length] ^ i);
  console.log('Keystream XOR UA XOR position:', Buffer.from(uaPosXor).toString('hex'));
}

main().catch(console.error);
