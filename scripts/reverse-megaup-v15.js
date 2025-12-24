#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v15
 * 
 * The error messages reveal the decrypted bytes!
 * Let's use this to extract the keystream.
 */

const crypto = require('crypto');

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function main() {
  // Create test inputs where we know the plaintext
  // If we send encrypted = keystream, then decrypted = 0x00 (all zeros)
  // If we send encrypted = keystream XOR plaintext, then decrypted = plaintext
  
  // First, let's get the keystream by sending all zeros
  console.log('=== Extracting keystream ===');
  
  // Send 64 bytes of zeros
  const zeros64 = Buffer.alloc(64, 0);
  const zeros64Base64 = zeros64.toString('base64');
  
  const result = await testDecryption(zeros64Base64, ua);
  console.log('Result:', result);
  
  // The error message shows the decrypted bytes
  // If input is all zeros, then decrypted = keystream (since 0 XOR keystream = keystream)
  
  // Let's try to extract the keystream from the error message
  if (result.error) {
    // Parse the error to extract the decrypted bytes
    const match = result.error.match(/Unexpected token '(.)', "(.+)" is not valid JSON/);
    if (match) {
      console.log('First decrypted char:', match[1], '(0x' + match[1].charCodeAt(0).toString(16) + ')');
      console.log('Decrypted preview:', match[2]);
    }
  }
  
  // Let's try a different approach: send the real encrypted data but with a modified UA
  // to see how the keystream changes
  
  console.log('\n=== Testing keystream derivation ===');
  
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  
  // Fetch real encrypted data
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  // Get decrypted with correct UA
  const decResult = await testDecryption(encrypted, ua);
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  
  console.log('Decrypted (correct UA):', decrypted.substring(0, 50));
  
  // Now try with wrong UA
  const wrongUA = 'WrongAgent/1.0';
  const wrongResult = await testDecryption(encrypted, wrongUA);
  console.log('Result (wrong UA):', wrongResult);
  
  // The hint says: "User-Agent must match one from /media/ request"
  // This means the server remembers which UA was used to fetch the encrypted data
  // and the decryption key is derived from that UA
  
  // Let's try to understand the algorithm by looking at the relationship
  // between encrypted and decrypted bytes
  
  console.log('\n=== Analyzing encryption algorithm ===');
  
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  // Extract keystream
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  console.log('Keystream (first 32):', Buffer.from(keystream.slice(0, 32)).toString('hex'));
  
  // Now let's try to find what generates this keystream
  // The keystream is: deb74f5a9861ebac7dbaf84c93b2947e55047fd28c0786650d9b6f84d57538d0...
  
  // Try to find if it's related to UA in a simple way
  const uaBytes = Buffer.from(ua);
  
  // Check if keystream[i] = f(UA[i % UA.length], i)
  console.log('\nChecking keystream[i] vs UA[i % UA.length]:');
  for (let i = 0; i < 10; i++) {
    const ks = keystream[i];
    const uaByte = uaBytes[i % uaBytes.length];
    const xor = ks ^ uaByte;
    const sum = (ks + uaByte) & 0xFF;
    const diff = (ks - uaByte) & 0xFF;
    console.log(`  [${i}] ks=${ks.toString(16).padStart(2, '0')} ua=${uaByte.toString(16).padStart(2, '0')} xor=${xor.toString(16).padStart(2, '0')} sum=${sum.toString(16).padStart(2, '0')} diff=${diff.toString(16).padStart(2, '0')}`);
  }
  
  // Try to find if there's a pattern in the XOR values
  const xorWithUA = keystream.map((k, i) => k ^ uaBytes[i % uaBytes.length]);
  console.log('\nXOR with UA (first 32):', Buffer.from(xorWithUA.slice(0, 32)).toString('hex'));
  
  // Check if XOR with UA produces a repeating pattern
  console.log('\nChecking for repeating pattern in XOR with UA:');
  for (const period of [16, 32, 64, 111]) {
    let matches = 0;
    for (let i = period; i < xorWithUA.length; i++) {
      if (xorWithUA[i] === xorWithUA[i % period]) matches++;
    }
    console.log(`  Period ${period}: ${matches}/${xorWithUA.length - period} matches`);
  }
}

main().catch(console.error);
