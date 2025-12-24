#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v13
 * 
 * Let's try to understand the encryption by testing with known plaintexts
 * and seeing how the ciphertext changes.
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
  
  // Extract keystream
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  console.log('\nKeystream (first 64 bytes):');
  console.log(Buffer.from(keystream.slice(0, 64)).toString('hex'));
  
  // The keystream is: deb74f5a9861ebac7dbaf84c93b2947e55047fd28c0786650d9b6f84d57538d0...
  // Let's try to find what generates this
  
  // Try PBKDF2
  console.log('\n=== Testing PBKDF2 ===');
  
  const salts = [
    Buffer.alloc(16, 0),
    Buffer.from('megaup'),
    Buffer.from(videoId),
    crypto.createHash('md5').update(ua).digest(),
  ];
  
  for (const salt of salts) {
    const derived = crypto.pbkdf2Sync(ua, salt, 1, 64, 'sha256');
    let matches = 0;
    for (let i = 0; i < 64; i++) {
      if (derived[i] === keystream[i]) matches++;
    }
    if (matches > 5) {
      console.log(`PBKDF2(UA, ${salt.toString('hex').slice(0, 16)}...): ${matches}/64 matches`);
    }
  }
  
  // Try HKDF
  console.log('\n=== Testing HKDF ===');
  
  for (const salt of salts) {
    try {
      const derived = crypto.hkdfSync('sha256', ua, salt, '', 64);
      let matches = 0;
      for (let i = 0; i < 64; i++) {
        if (derived[i] === keystream[i]) matches++;
      }
      if (matches > 5) {
        console.log(`HKDF(UA, ${salt.toString('hex').slice(0, 16)}...): ${matches}/64 matches`);
      }
    } catch (e) {
      // HKDF might not be available
    }
  }
  
  // Try scrypt
  console.log('\n=== Testing scrypt ===');
  
  for (const salt of salts) {
    try {
      const derived = crypto.scryptSync(ua, salt, 64, { N: 16384, r: 8, p: 1 });
      let matches = 0;
      for (let i = 0; i < 64; i++) {
        if (derived[i] === keystream[i]) matches++;
      }
      if (matches > 5) {
        console.log(`scrypt(UA, ${salt.toString('hex').slice(0, 16)}...): ${matches}/64 matches`);
      }
    } catch (e) {
      // scrypt might fail
    }
  }
  
  // Try AES in counter mode to generate keystream
  console.log('\n=== Testing AES-CTR keystream generation ===');
  
  const keys = [
    { name: 'MD5(UA)', key: crypto.createHash('md5').update(ua).digest() },
    { name: 'SHA256(UA)[0:16]', key: crypto.createHash('sha256').update(ua).digest().slice(0, 16) },
    { name: 'SHA256(UA)', key: crypto.createHash('sha256').update(ua).digest() },
  ];
  
  const ivs = [
    { name: 'zero', iv: Buffer.alloc(16, 0) },
    { name: 'MD5(UA)', iv: crypto.createHash('md5').update(ua).digest() },
    { name: 'first 16 enc bytes', iv: encBytes.slice(0, 16) },
  ];
  
  for (const { name: keyName, key } of keys) {
    for (const { name: ivName, iv } of ivs) {
      try {
        const cipher = crypto.createCipheriv(key.length === 32 ? 'aes-256-ctr' : 'aes-128-ctr', key, iv);
        const aesKeystream = cipher.update(Buffer.alloc(64, 0));
        
        let matches = 0;
        for (let i = 0; i < 64; i++) {
          if (aesKeystream[i] === keystream[i]) matches++;
        }
        if (matches > 5) {
          console.log(`AES-CTR(${keyName}, ${ivName}): ${matches}/64 matches`);
        }
      } catch (e) {
        // Silent
      }
    }
  }
  
  // Try Salsa20/ChaCha20
  console.log('\n=== Testing ChaCha20 ===');
  
  for (const { name: keyName, key } of keys) {
    if (key.length !== 32) continue;
    
    const nonces = [
      { name: 'zero', nonce: Buffer.alloc(12, 0) },
      { name: 'MD5(UA)[0:12]', nonce: crypto.createHash('md5').update(ua).digest().slice(0, 12) },
    ];
    
    for (const { name: nonceName, nonce } of nonces) {
      try {
        const cipher = crypto.createCipheriv('chacha20', key, Buffer.concat([Buffer.alloc(4, 0), nonce]));
        const chaKeystream = cipher.update(Buffer.alloc(64, 0));
        
        let matches = 0;
        for (let i = 0; i < 64; i++) {
          if (chaKeystream[i] === keystream[i]) matches++;
        }
        if (matches > 5) {
          console.log(`ChaCha20(${keyName}, ${nonceName}): ${matches}/64 matches`);
        }
      } catch (e) {
        // Silent
      }
    }
  }
  
  // Let's try to understand the keystream by looking at its structure
  console.log('\n=== Analyzing keystream structure ===');
  
  // Check if keystream has any relationship with position
  const positionXor = keystream.map((k, i) => k ^ (i & 0xFF));
  console.log('Keystream XOR position (first 32):', Buffer.from(positionXor.slice(0, 32)).toString('hex'));
  
  // Check if keystream is a permutation of something
  const histogram = new Array(256).fill(0);
  for (const byte of keystream) {
    histogram[byte]++;
  }
  const uniqueBytes = histogram.filter(c => c > 0).length;
  console.log(`Unique bytes in keystream: ${uniqueBytes}/256`);
  
  // Check entropy
  let entropy = 0;
  for (const count of histogram) {
    if (count > 0) {
      const p = count / keystream.length;
      entropy -= p * Math.log2(p);
    }
  }
  console.log(`Keystream entropy: ${entropy.toFixed(2)} bits (max 8)`);
}

main().catch(console.error);
