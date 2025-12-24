#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v10
 * 
 * Let's try to understand the encryption by testing edge cases
 * and looking for patterns in the enc-dec.app behavior.
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
  
  console.log('Encrypted:', encrypted.substring(0, 80) + '...');
  console.log('Encrypted length:', encrypted.length);
  
  // Decode base64
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  console.log('Decoded bytes:', encBytes.length);
  
  // Get decrypted
  const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent: ua }),
  });
  const decResult = await decResponse.json();
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  
  console.log('Decrypted:', decrypted.substring(0, 80) + '...');
  console.log('Decrypted length:', decrypted.length);
  
  // The encrypted data is 717 bytes, decrypted is 521 bytes
  // This suggests there might be padding or a header
  
  // Check if there's a header in the encrypted data
  console.log('\n--- Analyzing encrypted data structure ---');
  console.log('First 32 bytes:', encBytes.slice(0, 32).toString('hex'));
  console.log('Last 32 bytes:', encBytes.slice(-32).toString('hex'));
  
  // The ratio is 717/521 = 1.376, which is close to 4/3 (base64 expansion)
  // But we already decoded base64, so the actual ratio is different
  
  // Let's check if the encrypted data has any structure
  // Maybe it's: IV (16 bytes) + ciphertext + tag (16 bytes)?
  
  // Try AES-GCM with various key derivations
  console.log('\n--- Testing AES-GCM ---');
  
  const keyDerivations = [
    { name: 'MD5(UA)', key: crypto.createHash('md5').update(ua).digest() },
    { name: 'SHA256(UA)[0:16]', key: crypto.createHash('sha256').update(ua).digest().slice(0, 16) },
    { name: 'SHA256(UA)', key: crypto.createHash('sha256').update(ua).digest() },
  ];
  
  // GCM structure: nonce (12 bytes) + ciphertext + tag (16 bytes)
  const nonce12 = encBytes.slice(0, 12);
  const tag16 = encBytes.slice(-16);
  const gcmCiphertext = encBytes.slice(12, -16);
  
  console.log('Nonce (12):', nonce12.toString('hex'));
  console.log('Tag (16):', tag16.toString('hex'));
  console.log('Ciphertext length:', gcmCiphertext.length);
  
  for (const { name, key } of keyDerivations) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key.length === 32 ? key : Buffer.concat([key, key]).slice(0, 32), nonce12);
      decipher.setAuthTag(tag16);
      let result = decipher.update(gcmCiphertext);
      result = Buffer.concat([result, decipher.final()]);
      console.log(`AES-256-GCM(${name}): SUCCESS!`);
      console.log('Result:', result.toString('utf8').substring(0, 100));
    } catch (e) {
      // Silent
    }
    
    try {
      const decipher = crypto.createDecipheriv('aes-128-gcm', key.slice(0, 16), nonce12);
      decipher.setAuthTag(tag16);
      let result = decipher.update(gcmCiphertext);
      result = Buffer.concat([result, decipher.final()]);
      console.log(`AES-128-GCM(${name}): SUCCESS!`);
      console.log('Result:', result.toString('utf8').substring(0, 100));
    } catch (e) {
      // Silent
    }
  }
  
  // Try with different nonce/tag positions
  console.log('\n--- Testing different IV/tag positions ---');
  
  // Maybe: ciphertext + tag (16 bytes) with IV derived from key
  const tag16End = encBytes.slice(-16);
  const ciphertextNoTag = encBytes.slice(0, -16);
  
  for (const { name, key } of keyDerivations) {
    // Derive IV from key
    const derivedIV = crypto.createHash('md5').update(key).digest().slice(0, 12);
    
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key.length === 32 ? key : Buffer.concat([key, key]).slice(0, 32), derivedIV);
      decipher.setAuthTag(tag16End);
      let result = decipher.update(ciphertextNoTag);
      result = Buffer.concat([result, decipher.final()]);
      console.log(`AES-256-GCM(${name}, derived IV): SUCCESS!`);
      console.log('Result:', result.toString('utf8').substring(0, 100));
    } catch (e) {
      // Silent
    }
  }
  
  // Try CBC with PKCS7 padding
  console.log('\n--- Testing AES-CBC with padding ---');
  
  const iv16 = encBytes.slice(0, 16);
  const cbcCiphertext = encBytes.slice(16);
  
  for (const { name, key } of keyDerivations) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key.length === 32 ? key : Buffer.concat([key, key]).slice(0, 32), iv16);
      let result = decipher.update(cbcCiphertext);
      result = Buffer.concat([result, decipher.final()]);
      console.log(`AES-256-CBC(${name}): SUCCESS!`);
      console.log('Result:', result.toString('utf8').substring(0, 100));
    } catch (e) {
      // Silent
    }
    
    try {
      const decipher = crypto.createDecipheriv('aes-128-cbc', key.slice(0, 16), iv16);
      let result = decipher.update(cbcCiphertext);
      result = Buffer.concat([result, decipher.final()]);
      console.log(`AES-128-CBC(${name}): SUCCESS!`);
      console.log('Result:', result.toString('utf8').substring(0, 100));
    } catch (e) {
      // Silent
    }
  }
  
  // Try with CryptoJS-style key derivation (EVP_BytesToKey)
  console.log('\n--- Testing CryptoJS-style EVP key derivation ---');
  
  // Check if data starts with "Salted__"
  const saltedPrefix = Buffer.from('Salted__');
  if (encBytes.slice(0, 8).equals(saltedPrefix)) {
    console.log('Data has Salted__ prefix!');
    const salt = encBytes.slice(8, 16);
    const ciphertext = encBytes.slice(16);
    
    // EVP_BytesToKey derivation
    const { key, iv } = evpBytesToKey(ua, salt, 32, 16);
    console.log('Derived key:', key.toString('hex'));
    console.log('Derived IV:', iv.toString('hex'));
    
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let result = decipher.update(ciphertext);
      result = Buffer.concat([result, decipher.final()]);
      console.log('EVP AES-256-CBC: SUCCESS!');
      console.log('Result:', result.toString('utf8').substring(0, 100));
    } catch (e) {
      console.log('EVP AES-256-CBC failed:', e.message);
    }
  } else {
    console.log('No Salted__ prefix');
  }
  
  // Try XOR-based cipher with UA as key
  console.log('\n--- Testing XOR-based ciphers ---');
  
  // Simple repeating XOR
  let xorResult = '';
  for (let i = 0; i < encBytes.length; i++) {
    xorResult += String.fromCharCode(encBytes[i] ^ ua.charCodeAt(i % ua.length));
  }
  if (xorResult.includes('{') && xorResult.includes('sources')) {
    console.log('Simple XOR: SUCCESS!');
    console.log('Result:', xorResult.substring(0, 100));
  }
  
  // XOR with MD5(UA)
  const md5Key = crypto.createHash('md5').update(ua).digest();
  let md5XorResult = '';
  for (let i = 0; i < encBytes.length; i++) {
    md5XorResult += String.fromCharCode(encBytes[i] ^ md5Key[i % md5Key.length]);
  }
  if (md5XorResult.includes('{') && md5XorResult.includes('sources')) {
    console.log('XOR with MD5(UA): SUCCESS!');
    console.log('Result:', md5XorResult.substring(0, 100));
  }
}

function evpBytesToKey(password, salt, keyLen, ivLen) {
  const key = Buffer.alloc(keyLen);
  const iv = Buffer.alloc(ivLen);
  let derivedKey = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  
  while (derivedKey.length < keyLen + ivLen) {
    const hasher = crypto.createHash('md5');
    hasher.update(block);
    hasher.update(Buffer.from(password));
    if (salt) hasher.update(salt);
    block = hasher.digest();
    derivedKey = Buffer.concat([derivedKey, block]);
  }
  
  key.set(derivedKey.slice(0, keyLen));
  iv.set(derivedKey.slice(keyLen, keyLen + ivLen));
  
  return { key, iv };
}

main().catch(console.error);
