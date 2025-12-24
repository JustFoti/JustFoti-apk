#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v6
 * 
 * New approach: Analyze the relationship between encrypted and decrypted data
 * by getting multiple samples and looking for patterns.
 */

const crypto = require('crypto');

const videoIds = [
  'jIrrLzj-WS2JcOLzF79O5xvpCQ', // Gachiakuta
  'k5OoeWapWS2JcOLzF79O5xvpCQ', // Naruto
];

const baseUrl = 'https://megaup22.online';
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Try RC4 decryption (common in obfuscated JS)
function rc4(key, data) {
  const S = new Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key.charCodeAt(i % key.length)) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  let i = 0;
  j = 0;
  let result = '';
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    result += String.fromCharCode(data.charCodeAt(k) ^ S[(S[i] + S[j]) % 256]);
  }
  return result;
}

// Try XOR with key
function xorDecrypt(key, data) {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// Try simple substitution cipher
function analyzeSubstitution(encrypted, decrypted) {
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  console.log('Encrypted bytes:', encBytes.length);
  console.log('Decrypted bytes:', decBytes.length);
  
  // XOR first few bytes
  console.log('\nXOR of first 32 bytes:');
  for (let i = 0; i < Math.min(32, encBytes.length, decBytes.length); i++) {
    const xor = encBytes[i] ^ decBytes[i];
    console.log(`  [${i}] enc=${encBytes[i].toString(16).padStart(2, '0')} dec=${decBytes[i].toString(16).padStart(2, '0')} xor=${xor.toString(16).padStart(2, '0')} (${xor})`);
  }
}

async function main() {
  for (const videoId of videoIds) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Video ID: ${videoId}`);
    console.log('='.repeat(60));
    
    // Fetch encrypted data
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
    });
    const mediaData = await mediaResponse.json();
    const encrypted = mediaData.result;
    
    console.log(`Encrypted (${encrypted.length} chars): ${encrypted.substring(0, 80)}...`);
    
    // Get decrypted from enc-dec.app
    const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: encrypted, agent: ua }),
    });
    const decResult = await decResponse.json();
    const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
    
    console.log(`Decrypted (${decrypted.length} chars): ${decrypted.substring(0, 80)}...`);
    
    // Analyze
    analyzeSubstitution(encrypted, decrypted);
    
    // Try RC4 with various keys
    console.log('\n--- Trying RC4 ---');
    const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    const keys = [
      ua,
      videoId,
      ua + videoId,
      videoId + ua,
      crypto.createHash('md5').update(ua).digest('hex'),
      crypto.createHash('md5').update(videoId).digest('hex'),
    ];
    
    for (const key of keys) {
      const result = rc4(key, encBytes.toString('binary'));
      if (result.includes('{') && result.includes('sources')) {
        console.log(`RC4 with key "${key.substring(0, 30)}..." SUCCESS!`);
        console.log('Result:', result.substring(0, 200));
      }
    }
    
    // Try XOR with various keys
    console.log('\n--- Trying XOR ---');
    for (const key of keys) {
      const result = xorDecrypt(key, encBytes.toString('binary'));
      if (result.includes('{') && result.includes('sources')) {
        console.log(`XOR with key "${key.substring(0, 30)}..." SUCCESS!`);
        console.log('Result:', result.substring(0, 200));
      }
    }
    
    // Try AES with different modes
    console.log('\n--- Trying AES variations ---');
    
    // Check if data has a structure (IV prefix, etc.)
    console.log('First 32 bytes (hex):', encBytes.slice(0, 32).toString('hex'));
    console.log('Last 16 bytes (hex):', encBytes.slice(-16).toString('hex'));
    
    // Try AES-256-CTR (no padding needed)
    const md5Key = crypto.createHash('md5').update(ua).digest();
    const sha256Key = crypto.createHash('sha256').update(ua).digest();
    
    // Try with first 16 bytes as IV/nonce
    const iv16 = encBytes.slice(0, 16);
    const ciphertext = encBytes.slice(16);
    
    const modes = ['aes-256-ctr', 'aes-128-ctr', 'aes-256-cfb', 'aes-128-cfb', 'aes-256-ofb', 'aes-128-ofb'];
    
    for (const mode of modes) {
      try {
        const keySize = mode.includes('256') ? 32 : 16;
        const key = keySize === 32 ? sha256Key : md5Key;
        const decipher = crypto.createDecipheriv(mode, key, iv16);
        let result = decipher.update(ciphertext);
        result = Buffer.concat([result, decipher.final()]);
        const text = result.toString('utf8');
        if (text.includes('{') || text.includes('http')) {
          console.log(`${mode} SUCCESS!`);
          console.log('Result:', text.substring(0, 200));
        }
      } catch (e) {
        // Silent fail
      }
    }
  }
}

main().catch(console.error);
