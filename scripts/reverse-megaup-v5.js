#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v5
 * 
 * Let's try to understand the exact algorithm by:
 * 1. Looking at the relationship between encrypted and decrypted more carefully
 * 2. Trying common web encryption patterns (CryptoJS, etc.)
 */

const crypto = require('crypto');

const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
const baseUrl = 'https://megaup22.online';
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// CryptoJS-style key derivation (PBKDF2-like)
function evpKDF(password, salt, keySize, ivSize, iterations = 1) {
  const key = Buffer.alloc(keySize);
  const iv = Buffer.alloc(ivSize);
  let derivedKey = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  
  while (derivedKey.length < keySize + ivSize) {
    const hasher = crypto.createHash('md5');
    hasher.update(block);
    hasher.update(Buffer.from(password));
    if (salt) hasher.update(salt);
    block = hasher.digest();
    
    for (let i = 1; i < iterations; i++) {
      block = crypto.createHash('md5').update(block).digest();
    }
    
    derivedKey = Buffer.concat([derivedKey, block]);
  }
  
  key.set(derivedKey.slice(0, keySize));
  iv.set(derivedKey.slice(keySize, keySize + ivSize));
  
  return { key, iv };
}

async function main() {
  // Fetch encrypted data
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  // Get decrypted from enc-dec.app for verification
  const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent: ua }),
  });
  const decResult = await decResponse.json();
  const expectedDecrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  
  console.log('Expected decrypted:', expectedDecrypted.substring(0, 100));
  
  // Decode base64
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  console.log('\n=== Trying CryptoJS-style AES ===');
  
  // CryptoJS default: AES-256-CBC with EVP key derivation
  // The "Salted__" prefix indicates OpenSSL format
  
  // Check if data starts with "Salted__"
  const saltedPrefix = Buffer.from('Salted__');
  const hasSaltedPrefix = encBytes.slice(0, 8).equals(saltedPrefix);
  console.log('Has Salted__ prefix:', hasSaltedPrefix);
  
  if (hasSaltedPrefix) {
    const salt = encBytes.slice(8, 16);
    const ciphertext = encBytes.slice(16);
    console.log('Salt:', salt.toString('hex'));
    
    // Derive key and IV from password (UA) and salt
    const { key, iv } = evpKDF(ua, salt, 32, 16);
    console.log('Derived key:', key.toString('hex'));
    console.log('Derived IV:', iv.toString('hex'));
    
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let result = decipher.update(ciphertext);
      result = Buffer.concat([result, decipher.final()]);
      console.log('Decrypted:', result.toString('utf8').substring(0, 200));
    } catch (e) {
      console.log('Decryption failed:', e.message);
    }
  }
  
  // Try without salt prefix (raw encrypted data)
  console.log('\n=== Trying without salt prefix ===');
  
  // Maybe the first 16 bytes are IV
  const possibleIV = encBytes.slice(0, 16);
  const ciphertext = encBytes.slice(16);
  
  // Try with UA as password, derive key using MD5
  const md5Key = crypto.createHash('md5').update(ua).digest();
  const key32 = Buffer.concat([md5Key, crypto.createHash('md5').update(md5Key).update(ua).digest()]);
  
  console.log('MD5-derived key:', key32.toString('hex'));
  
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key32, possibleIV);
    let result = decipher.update(ciphertext);
    result = Buffer.concat([result, decipher.final()]);
    console.log('Decrypted:', result.toString('utf8').substring(0, 200));
  } catch (e) {
    console.log('Failed:', e.message);
  }
  
  // Try AES-128-CBC
  console.log('\n=== Trying AES-128-CBC ===');
  try {
    const decipher = crypto.createDecipheriv('aes-128-cbc', md5Key, possibleIV);
    let result = decipher.update(ciphertext);
    result = Buffer.concat([result, decipher.final()]);
    console.log('Decrypted:', result.toString('utf8').substring(0, 200));
  } catch (e) {
    console.log('Failed:', e.message);
  }
  
  // Try with different key derivations
  console.log('\n=== Trying various key derivations ===');
  
  const keyDerivations = [
    { name: 'SHA256(UA)', key: crypto.createHash('sha256').update(ua).digest() },
    { name: 'SHA256(UA+videoId)', key: crypto.createHash('sha256').update(ua + videoId).digest() },
    { name: 'MD5(UA)+MD5(MD5(UA))', key: Buffer.concat([md5Key, crypto.createHash('md5').update(md5Key).digest()]) },
    { name: 'HMAC-SHA256(UA, videoId)', key: crypto.createHmac('sha256', videoId).update(ua).digest() },
  ];
  
  for (const { name, key } of keyDerivations) {
    // Try AES-256-CBC with first 16 bytes as IV
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, possibleIV);
      let result = decipher.update(ciphertext);
      result = Buffer.concat([result, decipher.final()]);
      const text = result.toString('utf8');
      if (text.includes('{') || text.includes('http')) {
        console.log(`${name}: SUCCESS!`);
        console.log('Result:', text.substring(0, 200));
      }
    } catch (e) {
      // Silent fail
    }
    
    // Try with IV derived from key
    try {
      const derivedIV = crypto.createHash('md5').update(key).digest();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, derivedIV);
      let result = decipher.update(encBytes);
      result = Buffer.concat([result, decipher.final()]);
      const text = result.toString('utf8');
      if (text.includes('{') || text.includes('http')) {
        console.log(`${name} (derived IV): SUCCESS!`);
        console.log('Result:', text.substring(0, 200));
      }
    } catch (e) {
      // Silent fail
    }
  }
  
  // Try GCM mode (common in modern web apps)
  console.log('\n=== Trying AES-GCM ===');
  
  // GCM typically has: nonce (12 bytes) + ciphertext + tag (16 bytes)
  const nonce = encBytes.slice(0, 12);
  const tag = encBytes.slice(-16);
  const gcmCiphertext = encBytes.slice(12, -16);
  
  for (const { name, key } of keyDerivations) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
      decipher.setAuthTag(tag);
      let result = decipher.update(gcmCiphertext);
      result = Buffer.concat([result, decipher.final()]);
      const text = result.toString('utf8');
      if (text.includes('{') || text.includes('http')) {
        console.log(`GCM ${name}: SUCCESS!`);
        console.log('Result:', text.substring(0, 200));
      }
    } catch (e) {
      // Silent fail
    }
  }
  
  // Try ChaCha20-Poly1305
  console.log('\n=== Trying ChaCha20-Poly1305 ===');
  
  for (const { name, key } of keyDerivations) {
    try {
      const decipher = crypto.createDecipheriv('chacha20-poly1305', key, nonce);
      decipher.setAuthTag(tag);
      let result = decipher.update(gcmCiphertext);
      result = Buffer.concat([result, decipher.final()]);
      const text = result.toString('utf8');
      if (text.includes('{') || text.includes('http')) {
        console.log(`ChaCha20 ${name}: SUCCESS!`);
        console.log('Result:', text.substring(0, 200));
      }
    } catch (e) {
      // Silent fail
    }
  }
}

main().catch(console.error);
