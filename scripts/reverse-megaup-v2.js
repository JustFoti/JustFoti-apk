#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v2
 * 
 * Key observations:
 * 1. Encrypted data is URL-safe base64 (A-Za-z0-9-_)
 * 2. Different UAs produce slightly different encrypted outputs
 * 3. The decrypted output is always the same JSON
 * 4. Ratio is ~1.83 (base64 of encrypted binary)
 * 
 * This suggests: AES or similar block cipher with UA-derived key
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
  
  // Get decrypted from enc-dec.app
  const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent: ua }),
  });
  const decResult = await decResponse.json();
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  
  console.log('Encrypted length:', encrypted.length);
  console.log('Decrypted length:', decrypted.length);
  console.log('Decrypted:', decrypted.substring(0, 200));
  
  // Decode base64
  const urlSafeB64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
  const encryptedBytes = Buffer.from(urlSafeB64, 'base64');
  console.log('\nEncrypted bytes length:', encryptedBytes.length);
  console.log('First 32 bytes (hex):', encryptedBytes.slice(0, 32).toString('hex'));
  
  // Check if first bytes could be IV
  const possibleIV = encryptedBytes.slice(0, 16);
  const ciphertext = encryptedBytes.slice(16);
  console.log('\nPossible IV (16 bytes):', possibleIV.toString('hex'));
  console.log('Ciphertext length:', ciphertext.length);
  
  // Try different key derivations from UA
  console.log('\n=== Trying AES decryption ===');
  
  // Common key derivation methods
  const keyDerivations = [
    { name: 'MD5 of UA', key: crypto.createHash('md5').update(ua).digest() },
    { name: 'SHA256 of UA (first 16)', key: crypto.createHash('sha256').update(ua).digest().slice(0, 16) },
    { name: 'SHA256 of UA (first 32)', key: crypto.createHash('sha256').update(ua).digest().slice(0, 32) },
    { name: 'First 16 chars of UA', key: Buffer.from(ua.substring(0, 16)) },
    { name: 'First 32 chars of UA', key: Buffer.from(ua.substring(0, 32)) },
  ];
  
  for (const { name, key } of keyDerivations) {
    // Try AES-128-CBC
    try {
      const decipher = crypto.createDecipheriv('aes-128-cbc', key.slice(0, 16), possibleIV);
      decipher.setAutoPadding(true);
      let result = decipher.update(ciphertext);
      result = Buffer.concat([result, decipher.final()]);
      const text = result.toString('utf8');
      if (text.includes('{') || text.includes('http')) {
        console.log(`AES-128-CBC with ${name}: SUCCESS!`);
        console.log('  Result:', text.substring(0, 200));
      }
    } catch (e) {
      // Silently fail
    }
    
    // Try AES-256-CBC
    if (key.length >= 32) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key.slice(0, 32), possibleIV);
        decipher.setAutoPadding(true);
        let result = decipher.update(ciphertext);
        result = Buffer.concat([result, decipher.final()]);
        const text = result.toString('utf8');
        if (text.includes('{') || text.includes('http')) {
          console.log(`AES-256-CBC with ${name}: SUCCESS!`);
          console.log('  Result:', text.substring(0, 200));
        }
      } catch (e) {
        // Silently fail
      }
    }
  }
  
  // Try without IV (ECB mode or IV at different position)
  console.log('\n=== Trying without separate IV ===');
  
  // Maybe the whole thing is ciphertext and IV is derived
  for (const { name, key } of keyDerivations) {
    // Try with zero IV
    try {
      const zeroIV = Buffer.alloc(16, 0);
      const decipher = crypto.createDecipheriv('aes-128-cbc', key.slice(0, 16), zeroIV);
      decipher.setAutoPadding(true);
      let result = decipher.update(encryptedBytes);
      result = Buffer.concat([result, decipher.final()]);
      const text = result.toString('utf8');
      if (text.includes('{') || text.includes('http')) {
        console.log(`AES-128-CBC (zero IV) with ${name}: SUCCESS!`);
        console.log('  Result:', text.substring(0, 200));
      }
    } catch (e) {
      // Silently fail
    }
    
    // Try AES-128-ECB
    try {
      const decipher = crypto.createDecipheriv('aes-128-ecb', key.slice(0, 16), null);
      decipher.setAutoPadding(true);
      let result = decipher.update(encryptedBytes);
      result = Buffer.concat([result, decipher.final()]);
      const text = result.toString('utf8');
      if (text.includes('{') || text.includes('http')) {
        console.log(`AES-128-ECB with ${name}: SUCCESS!`);
        console.log('  Result:', text.substring(0, 200));
      }
    } catch (e) {
      // Silently fail
    }
  }
  
  // Try with IV derived from UA
  console.log('\n=== Trying with IV derived from UA ===');
  const ivDerivations = [
    { name: 'MD5 of UA', iv: crypto.createHash('md5').update(ua).digest() },
    { name: 'First 16 of SHA256', iv: crypto.createHash('sha256').update(ua).digest().slice(0, 16) },
    { name: 'Last 16 of SHA256', iv: crypto.createHash('sha256').update(ua).digest().slice(16, 32) },
  ];
  
  for (const keyDeriv of keyDerivations) {
    for (const ivDeriv of ivDerivations) {
      try {
        const decipher = crypto.createDecipheriv('aes-128-cbc', keyDeriv.key.slice(0, 16), ivDeriv.iv);
        decipher.setAutoPadding(true);
        let result = decipher.update(encryptedBytes);
        result = Buffer.concat([result, decipher.final()]);
        const text = result.toString('utf8');
        if (text.includes('{') || text.includes('http')) {
          console.log(`AES-128-CBC key=${keyDeriv.name}, iv=${ivDeriv.name}: SUCCESS!`);
          console.log('  Result:', text.substring(0, 200));
        }
      } catch (e) {
        // Silently fail
      }
    }
  }
  
  // Check if it might be a custom cipher
  console.log('\n=== Analyzing byte patterns ===');
  
  // XOR the encrypted bytes with the decrypted bytes to find the keystream
  const decryptedBytes = Buffer.from(decrypted, 'utf8');
  console.log('Decrypted bytes length:', decryptedBytes.length);
  
  // The encrypted is longer, so there's padding or the cipher adds data
  // Let's see if we can find a pattern
  
  // Try to find if there's a simple XOR relationship
  console.log('\n=== Looking for XOR keystream ===');
  const minLen = Math.min(encryptedBytes.length, decryptedBytes.length);
  const keystream = Buffer.alloc(minLen);
  for (let i = 0; i < minLen; i++) {
    keystream[i] = encryptedBytes[i] ^ decryptedBytes[i];
  }
  console.log('Keystream first 64 bytes:', keystream.slice(0, 64).toString('hex'));
  
  // Check if keystream repeats (would indicate simple XOR cipher)
  const keystreamStr = keystream.toString('hex');
  for (let period = 1; period <= 32; period++) {
    let matches = true;
    for (let i = period; i < Math.min(keystreamStr.length, period * 4); i++) {
      if (keystreamStr[i] !== keystreamStr[i % period]) {
        matches = false;
        break;
      }
    }
    if (matches && period > 1) {
      console.log(`Keystream might repeat with period ${period}`);
      console.log('Pattern:', keystreamStr.substring(0, period * 2));
    }
  }
}

main().catch(console.error);
