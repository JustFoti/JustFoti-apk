#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v7
 * 
 * Key insight: The XOR pattern is IDENTICAL for different videos!
 * This means the encryption uses a fixed keystream derived from the User-Agent.
 * 
 * Let's extract the keystream and see if we can find the pattern.
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
  
  // Decode base64
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  console.log('Encrypted bytes:', encBytes.length);
  console.log('Decrypted bytes:', decBytes.length);
  
  // Extract the keystream by XORing encrypted with decrypted
  const keystream = [];
  for (let i = 0; i < Math.min(encBytes.length, decBytes.length); i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  console.log('\nKeystream (first 64 bytes):');
  console.log(Buffer.from(keystream.slice(0, 64)).toString('hex'));
  
  // Check if keystream has a repeating pattern
  console.log('\nChecking for repeating patterns...');
  for (const period of [16, 32, 64, 128, 256]) {
    let matches = 0;
    let total = 0;
    for (let i = period; i < keystream.length; i++) {
      if (keystream[i] === keystream[i % period]) matches++;
      total++;
    }
    console.log(`Period ${period}: ${matches}/${total} matches (${(matches/total*100).toFixed(1)}%)`);
  }
  
  // Try RC4 with UA as key
  console.log('\n--- Testing RC4 with UA key ---');
  const rc4Keystream = generateRC4Keystream(ua, encBytes.length);
  let rc4Matches = 0;
  for (let i = 0; i < keystream.length; i++) {
    if (rc4Keystream[i] === keystream[i]) rc4Matches++;
  }
  console.log(`RC4(UA) keystream matches: ${rc4Matches}/${keystream.length}`);
  
  // Try RC4 with MD5(UA) as key
  const md5UA = crypto.createHash('md5').update(ua).digest('hex');
  const rc4MD5Keystream = generateRC4Keystream(md5UA, encBytes.length);
  let rc4MD5Matches = 0;
  for (let i = 0; i < keystream.length; i++) {
    if (rc4MD5Keystream[i] === keystream[i]) rc4MD5Matches++;
  }
  console.log(`RC4(MD5(UA)) keystream matches: ${rc4MD5Matches}/${keystream.length}`);
  
  // Try RC4 with various key derivations
  const keyDerivations = [
    { name: 'UA', key: ua },
    { name: 'MD5(UA)', key: md5UA },
    { name: 'SHA256(UA)', key: crypto.createHash('sha256').update(ua).digest('hex') },
    { name: 'UA reversed', key: ua.split('').reverse().join('') },
    { name: 'UA lowercase', key: ua.toLowerCase() },
  ];
  
  console.log('\n--- Testing various RC4 keys ---');
  for (const { name, key } of keyDerivations) {
    const ks = generateRC4Keystream(key, encBytes.length);
    let matches = 0;
    for (let i = 0; i < keystream.length; i++) {
      if (ks[i] === keystream[i]) matches++;
    }
    if (matches > keystream.length * 0.1) {
      console.log(`${name}: ${matches}/${keystream.length} matches (${(matches/keystream.length*100).toFixed(1)}%)`);
    }
  }
  
  // Try to find the key by analyzing the keystream
  console.log('\n--- Analyzing keystream structure ---');
  
  // Check if it looks like AES-CTR output (should be pseudo-random)
  const histogram = new Array(256).fill(0);
  for (const byte of keystream) {
    histogram[byte]++;
  }
  const expectedFreq = keystream.length / 256;
  let chiSquare = 0;
  for (const freq of histogram) {
    chiSquare += Math.pow(freq - expectedFreq, 2) / expectedFreq;
  }
  console.log(`Chi-square statistic: ${chiSquare.toFixed(2)} (random would be ~255)`);
  
  // Try to decrypt using the extracted keystream (should work perfectly)
  console.log('\n--- Verifying keystream extraction ---');
  const decryptedWithKeystream = [];
  for (let i = 0; i < encBytes.length; i++) {
    decryptedWithKeystream.push(encBytes[i] ^ keystream[i % keystream.length]);
  }
  const result = Buffer.from(decryptedWithKeystream).toString('utf8');
  console.log('Decrypted with extracted keystream:', result.substring(0, 100));
  
  // Now let's try to figure out how the keystream is generated
  // Since it's the same for different videos, it must be derived from UA only
  
  // Try AES-CTR with UA-derived key and zero IV
  console.log('\n--- Testing AES-CTR with zero IV ---');
  const zeroIV = Buffer.alloc(16, 0);
  const sha256Key = crypto.createHash('sha256').update(ua).digest();
  
  try {
    const cipher = crypto.createCipheriv('aes-256-ctr', sha256Key, zeroIV);
    const aesKeystream = cipher.update(Buffer.alloc(encBytes.length, 0));
    let aesMatches = 0;
    for (let i = 0; i < keystream.length; i++) {
      if (aesKeystream[i] === keystream[i]) aesMatches++;
    }
    console.log(`AES-256-CTR(SHA256(UA), zero IV) matches: ${aesMatches}/${keystream.length}`);
  } catch (e) {
    console.log('AES-CTR error:', e.message);
  }
  
  // Try with MD5 key
  const md5Key = crypto.createHash('md5').update(ua).digest();
  try {
    const cipher = crypto.createCipheriv('aes-128-ctr', md5Key, zeroIV);
    const aesKeystream = cipher.update(Buffer.alloc(encBytes.length, 0));
    let aesMatches = 0;
    for (let i = 0; i < keystream.length; i++) {
      if (aesKeystream[i] === keystream[i]) aesMatches++;
    }
    console.log(`AES-128-CTR(MD5(UA), zero IV) matches: ${aesMatches}/${keystream.length}`);
  } catch (e) {
    console.log('AES-CTR error:', e.message);
  }
}

function generateRC4Keystream(key, length) {
  const S = new Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key.charCodeAt(i % key.length)) % 256;
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
