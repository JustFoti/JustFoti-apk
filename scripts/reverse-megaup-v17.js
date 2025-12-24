#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v17
 * 
 * Key findings:
 * 1. First 32 bytes don't affect decryption - likely a header/IV
 * 2. Encrypted data changes slightly between requests
 * 3. The actual ciphertext starts at byte 32
 * 
 * Let's analyze the header and find the encryption algorithm.
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
  
  console.log('Total encrypted bytes:', encBytes.length);
  console.log('Decrypted bytes:', decBytes.length);
  
  // Analyze the header (first 32 bytes)
  console.log('\n=== Header Analysis (first 32 bytes) ===');
  const header = encBytes.slice(0, 32);
  console.log('Header hex:', header.toString('hex'));
  
  // Check if header contains any recognizable patterns
  console.log('Header as ASCII:', header.toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
  
  // The actual ciphertext starts at byte 32
  const ciphertext = encBytes.slice(32);
  console.log('\nCiphertext length:', ciphertext.length);
  console.log('Ciphertext (first 32):', ciphertext.slice(0, 32).toString('hex'));
  
  // Now let's see if the ciphertext XORs directly with the plaintext
  console.log('\n=== Ciphertext vs Plaintext Analysis ===');
  
  // XOR ciphertext with plaintext
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(ciphertext[i] ^ decBytes[i]);
  }
  console.log('Keystream (first 32):', Buffer.from(keystream.slice(0, 32)).toString('hex'));
  
  // Check if keystream is related to UA
  const uaBytes = Buffer.from(ua);
  
  // Try RC4 with UA
  const rc4Ks = generateRC4Keystream(ua, keystream.length);
  let rc4Matches = 0;
  for (let i = 0; i < keystream.length; i++) {
    if (rc4Ks[i] === keystream[i]) rc4Matches++;
  }
  console.log(`RC4(UA) matches: ${rc4Matches}/${keystream.length}`);
  
  // Try RC4 with header as key
  const rc4HeaderKs = generateRC4Keystream(header.toString('binary'), keystream.length);
  let rc4HeaderMatches = 0;
  for (let i = 0; i < keystream.length; i++) {
    if (rc4HeaderKs[i] === keystream[i]) rc4HeaderMatches++;
  }
  console.log(`RC4(header) matches: ${rc4HeaderMatches}/${keystream.length}`);
  
  // Try RC4 with UA + header
  const rc4CombinedKs = generateRC4Keystream(ua + header.toString('binary'), keystream.length);
  let rc4CombinedMatches = 0;
  for (let i = 0; i < keystream.length; i++) {
    if (rc4CombinedKs[i] === keystream[i]) rc4CombinedMatches++;
  }
  console.log(`RC4(UA + header) matches: ${rc4CombinedMatches}/${keystream.length}`);
  
  // Try AES-CTR with header as IV
  console.log('\n=== Testing AES-CTR with header as IV ===');
  
  const keys = [
    { name: 'MD5(UA)', key: crypto.createHash('md5').update(ua).digest() },
    { name: 'SHA256(UA)', key: crypto.createHash('sha256').update(ua).digest() },
  ];
  
  for (const { name, key } of keys) {
    // Use first 16 bytes of header as IV
    const iv = header.slice(0, 16);
    
    try {
      const cipher = crypto.createCipheriv(key.length === 32 ? 'aes-256-ctr' : 'aes-128-ctr', key, iv);
      const aesKeystream = cipher.update(Buffer.alloc(keystream.length, 0));
      
      let matches = 0;
      for (let i = 0; i < keystream.length; i++) {
        if (aesKeystream[i] === keystream[i]) matches++;
      }
      console.log(`AES-CTR(${name}, header[0:16]): ${matches}/${keystream.length} matches`);
    } catch (e) {
      console.log(`AES-CTR(${name}): ${e.message}`);
    }
  }
  
  // Try with second 16 bytes of header as IV
  for (const { name, key } of keys) {
    const iv = header.slice(16, 32);
    
    try {
      const cipher = crypto.createCipheriv(key.length === 32 ? 'aes-256-ctr' : 'aes-128-ctr', key, iv);
      const aesKeystream = cipher.update(Buffer.alloc(keystream.length, 0));
      
      let matches = 0;
      for (let i = 0; i < keystream.length; i++) {
        if (aesKeystream[i] === keystream[i]) matches++;
      }
      console.log(`AES-CTR(${name}, header[16:32]): ${matches}/${keystream.length} matches`);
    } catch (e) {
      console.log(`AES-CTR(${name}): ${e.message}`);
    }
  }
  
  // Let's also check if the header is derived from UA
  console.log('\n=== Header derivation analysis ===');
  
  const md5UA = crypto.createHash('md5').update(ua).digest();
  const sha256UA = crypto.createHash('sha256').update(ua).digest();
  
  console.log('MD5(UA):', md5UA.toString('hex'));
  console.log('SHA256(UA):', sha256UA.toString('hex'));
  console.log('Header:', header.toString('hex'));
  
  // Check if header matches any hash
  console.log('Header == MD5(UA):', header.slice(0, 16).equals(md5UA));
  console.log('Header == SHA256(UA):', header.equals(sha256UA));
}

function generateRC4Keystream(key, length) {
  const S = new Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    const keyByte = typeof key === 'string' ? key.charCodeAt(i % key.length) : key[i % key.length];
    j = (j + S[i] + keyByte) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  const keystream = [];
  let i = 0;
  j = 0;
  for (let k = 0; k < length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    keystream.push(S[(S[i] + S[j]) % 256]);
  }
  return keystream;
}

main().catch(console.error);
