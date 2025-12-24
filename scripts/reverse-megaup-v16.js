#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v16
 * 
 * Key finding: The keystream is different for different inputs!
 * - All zeros → keystream starts with 0x8E
 * - Real data → keystream starts with 0xDE
 * 
 * This suggests the encryption might be:
 * 1. A block cipher (not stream cipher)
 * 2. A cipher with feedback (like CFB or OFB)
 * 3. Something that depends on the ciphertext
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
  // Get real encrypted data
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  // Get decrypted
  const decResult = await testDecryption(encrypted, ua);
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  console.log('Encrypted bytes:', encBytes.length);
  console.log('Decrypted bytes:', decBytes.length);
  
  // Extract keystream
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  console.log('Keystream (first 32):', Buffer.from(keystream.slice(0, 32)).toString('hex'));
  
  // Now let's test if the keystream depends on the ciphertext
  // by modifying one byte of the ciphertext and seeing how the decryption changes
  
  console.log('\n=== Testing ciphertext dependency ===');
  
  // Modify first byte
  const modified1 = Buffer.from(encBytes);
  modified1[0] ^= 0x01; // Flip one bit
  const modified1Base64 = modified1.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const result1 = await testDecryption(modified1Base64, ua);
  console.log('Modified byte 0:', result1.error ? result1.error.substring(0, 100) : (typeof result1.result === 'string' ? result1.result.substring(0, 50) : JSON.stringify(result1.result).substring(0, 50)));
  
  // Modify byte 16
  const modified16 = Buffer.from(encBytes);
  modified16[16] ^= 0x01;
  const modified16Base64 = modified16.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const result16 = await testDecryption(modified16Base64, ua);
  console.log('Modified byte 16:', result16.error ? result16.error.substring(0, 100) : (typeof result16.result === 'string' ? result16.result.substring(0, 50) : JSON.stringify(result16.result).substring(0, 50)));
  
  // If modifying byte 0 only affects byte 0 of plaintext, it's a stream cipher
  // If it affects multiple bytes, it's a block cipher with feedback
  
  // Let's try to understand the structure better
  console.log('\n=== Analyzing block structure ===');
  
  // Check if there's a 16-byte block structure (AES)
  // In CBC mode, modifying ciphertext byte i affects:
  // - Plaintext byte i (in the same block)
  // - All bytes in the next block
  
  // Let's test by modifying different positions
  for (const pos of [0, 15, 16, 31, 32]) {
    const modified = Buffer.from(encBytes);
    modified[pos] ^= 0xFF;
    const modifiedBase64 = modified.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    const result = await testDecryption(modifiedBase64, ua);
    if (result.status === 200) {
      const dec = typeof result.result === 'string' ? result.result : JSON.stringify(result.result);
      // Find which bytes changed
      const changes = [];
      for (let i = 0; i < Math.min(dec.length, decrypted.length); i++) {
        if (dec.charCodeAt(i) !== decrypted.charCodeAt(i)) {
          changes.push(i);
        }
      }
      console.log(`Modified pos ${pos}: ${changes.length} bytes changed at positions ${changes.slice(0, 10).join(', ')}${changes.length > 10 ? '...' : ''}`);
    } else {
      console.log(`Modified pos ${pos}: ${result.error?.substring(0, 50)}`);
    }
  }
  
  // Let's also check if the encryption is deterministic
  console.log('\n=== Testing determinism ===');
  
  // Fetch the same video again
  const mediaResponse2 = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData2 = await mediaResponse2.json();
  const encrypted2 = mediaData2.result;
  
  console.log('Same encrypted data:', encrypted === encrypted2);
  
  if (encrypted !== encrypted2) {
    const encBytes2 = Buffer.from(encrypted2.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    // Find differences
    let diffCount = 0;
    for (let i = 0; i < Math.min(encBytes.length, encBytes2.length); i++) {
      if (encBytes[i] !== encBytes2[i]) diffCount++;
    }
    console.log(`Differences: ${diffCount}/${Math.min(encBytes.length, encBytes2.length)}`);
  }
}

main().catch(console.error);
