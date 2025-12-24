#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v4
 * 
 * Key insight: The encrypted data changes based on UA, but the decrypted is the same.
 * This means the server encrypts with a key derived from UA.
 * 
 * Let's try to find the exact algorithm by analyzing the app.js more carefully.
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
  
  console.log('Encrypted:', encrypted.substring(0, 80));
  console.log('Decrypted:', decrypted.substring(0, 80));
  
  // Decode base64
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  console.log('\nEncrypted bytes:', encBytes.length);
  console.log('Decrypted bytes:', decBytes.length);
  console.log('Difference:', encBytes.length - decBytes.length);
  
  // The difference (196 bytes) might be:
  // - 16 byte IV + padding
  // - Or some header/footer
  
  // Let's try AES with different key derivations
  console.log('\n=== Trying AES-256-CBC ===');
  
  // Common patterns: key = md5(ua), iv = first 16 bytes of ciphertext
  const possibleIV = encBytes.slice(0, 16);
  const ciphertext = encBytes.slice(16);
  
  // Try MD5 of UA as key (padded to 32 bytes)
  const md5Key = crypto.createHash('md5').update(ua).digest();
  const key32 = Buffer.concat([md5Key, md5Key]); // 32 bytes for AES-256
  
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key32, possibleIV);
    let result = decipher.update(ciphertext);
    result = Buffer.concat([result, decipher.final()]);
    console.log('MD5 key + first 16 as IV:', result.toString('utf8').substring(0, 100));
  } catch (e) {
    console.log('MD5 key failed:', e.message);
  }
  
  // Try SHA256 of UA
  const sha256Key = crypto.createHash('sha256').update(ua).digest();
  
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', sha256Key, possibleIV);
    let result = decipher.update(ciphertext);
    result = Buffer.concat([result, decipher.final()]);
    console.log('SHA256 key + first 16 as IV:', result.toString('utf8').substring(0, 100));
  } catch (e) {
    console.log('SHA256 key failed:', e.message);
  }
  
  // Try with IV derived from UA too
  const sha256Full = crypto.createHash('sha256').update(ua).digest();
  const derivedIV = sha256Full.slice(16, 32);
  
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', sha256Full.slice(0, 32), derivedIV);
    let result = decipher.update(encBytes);
    result = Buffer.concat([result, decipher.final()]);
    console.log('SHA256 key + SHA256 IV:', result.toString('utf8').substring(0, 100));
  } catch (e) {
    console.log('SHA256 key + IV failed:', e.message);
  }
  
  // Try RC4 (stream cipher, no IV needed)
  console.log('\n=== Trying RC4 ===');
  
  function rc4Decrypt(key, data) {
    const S = [];
    for (let i = 0; i < 256; i++) S[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + key[i % key.length]) % 256;
      [S[i], S[j]] = [S[j], S[i]];
    }
    const result = Buffer.alloc(data.length);
    let ii = 0;
    j = 0;
    for (let k = 0; k < data.length; k++) {
      ii = (ii + 1) % 256;
      j = (j + S[ii]) % 256;
      [S[ii], S[j]] = [S[j], S[ii]];
      result[k] = data[k] ^ S[(S[ii] + S[j]) % 256];
    }
    return result;
  }
  
  // Try RC4 with different keys
  const rc4Keys = [
    Buffer.from(ua),
    md5Key,
    sha256Key,
    Buffer.from(ua.substring(0, 32)),
  ];
  
  for (const key of rc4Keys) {
    const result = rc4Decrypt(key, encBytes);
    const text = result.toString('utf8');
    if (text.includes('{') || text.includes('http') || text.includes('sources')) {
      console.log(`RC4 with key length ${key.length}: SUCCESS!`);
      console.log('Result:', text.substring(0, 200));
    }
  }
  
  // Try Blowfish
  console.log('\n=== Trying Blowfish ===');
  try {
    const decipher = crypto.createDecipheriv('bf-cbc', md5Key.slice(0, 16), possibleIV.slice(0, 8));
    let result = decipher.update(ciphertext);
    result = Buffer.concat([result, decipher.final()]);
    console.log('Blowfish:', result.toString('utf8').substring(0, 100));
  } catch (e) {
    console.log('Blowfish failed:', e.message);
  }
  
  // Try DES
  console.log('\n=== Trying DES ===');
  try {
    const decipher = crypto.createDecipheriv('des-cbc', md5Key.slice(0, 8), possibleIV.slice(0, 8));
    let result = decipher.update(ciphertext);
    result = Buffer.concat([result, decipher.final()]);
    console.log('DES:', result.toString('utf8').substring(0, 100));
  } catch (e) {
    console.log('DES failed:', e.message);
  }
  
  // Try Triple DES
  console.log('\n=== Trying 3DES ===');
  try {
    const decipher = crypto.createDecipheriv('des-ede3-cbc', Buffer.concat([md5Key, md5Key.slice(0, 8)]), possibleIV.slice(0, 8));
    let result = decipher.update(ciphertext);
    result = Buffer.concat([result, decipher.final()]);
    console.log('3DES:', result.toString('utf8').substring(0, 100));
  } catch (e) {
    console.log('3DES failed:', e.message);
  }
  
  // Maybe it's a custom XOR with a derived keystream
  console.log('\n=== Analyzing as custom cipher ===');
  
  // If we XOR encrypted with decrypted, we get the keystream
  const minLen = Math.min(encBytes.length, decBytes.length);
  const keystream = Buffer.alloc(minLen);
  for (let i = 0; i < minLen; i++) {
    keystream[i] = encBytes[i] ^ decBytes[i];
  }
  
  console.log('Keystream first 32 bytes:', keystream.slice(0, 32).toString('hex'));
  
  // Check if keystream is related to UA
  const uaBytes = Buffer.from(ua);
  let uaMatch = 0;
  for (let i = 0; i < Math.min(keystream.length, uaBytes.length); i++) {
    if (keystream[i] === uaBytes[i]) uaMatch++;
  }
  console.log('Keystream matches UA bytes:', uaMatch, '/', Math.min(keystream.length, uaBytes.length));
  
  // Check if keystream XOR UA gives a constant
  const keystreamXorUA = Buffer.alloc(Math.min(keystream.length, uaBytes.length));
  for (let i = 0; i < keystreamXorUA.length; i++) {
    keystreamXorUA[i] = keystream[i] ^ uaBytes[i % uaBytes.length];
  }
  console.log('Keystream XOR UA:', keystreamXorUA.slice(0, 32).toString('hex'));
  
  // Check if that's a repeating pattern
  const pattern = keystreamXorUA.slice(0, 16).toString('hex');
  let repeats = true;
  for (let i = 16; i < keystreamXorUA.length; i += 16) {
    if (keystreamXorUA.slice(i, i + 16).toString('hex') !== pattern) {
      repeats = false;
      break;
    }
  }
  console.log('Pattern repeats every 16 bytes:', repeats);
}

main().catch(console.error);
