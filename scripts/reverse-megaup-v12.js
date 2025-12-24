#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v12
 * 
 * Key finding: Removing 196 bytes from either end gives matching length!
 * This suggests the encrypted data might have a 196-byte header OR footer.
 * 
 * Let's test both scenarios.
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
  
  // Test 1: Remove 196-byte header
  console.log('\n=== Testing 196-byte HEADER removal ===');
  const withoutHeader = encBytes.slice(196);
  
  // Extract keystream
  const keystreamHeader = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystreamHeader.push(withoutHeader[i] ^ decBytes[i]);
  }
  
  console.log('Keystream (first 32):', Buffer.from(keystreamHeader.slice(0, 32)).toString('hex'));
  
  // Check if keystream is related to UA
  const uaBytes = Buffer.from(ua);
  let uaMatchesHeader = 0;
  for (let i = 0; i < keystreamHeader.length; i++) {
    if (keystreamHeader[i] === uaBytes[i % uaBytes.length]) uaMatchesHeader++;
  }
  console.log(`Keystream matches UA: ${uaMatchesHeader}/${keystreamHeader.length}`);
  
  // Try RC4 with UA
  const rc4Ks = generateRC4Keystream(ua, keystreamHeader.length);
  let rc4MatchesHeader = 0;
  for (let i = 0; i < keystreamHeader.length; i++) {
    if (rc4Ks[i] === keystreamHeader[i]) rc4MatchesHeader++;
  }
  console.log(`Keystream matches RC4(UA): ${rc4MatchesHeader}/${keystreamHeader.length}`);
  
  // Test 2: Remove 196-byte footer
  console.log('\n=== Testing 196-byte FOOTER removal ===');
  const withoutFooter = encBytes.slice(0, -196);
  
  // Extract keystream
  const keystreamFooter = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystreamFooter.push(withoutFooter[i] ^ decBytes[i]);
  }
  
  console.log('Keystream (first 32):', Buffer.from(keystreamFooter.slice(0, 32)).toString('hex'));
  
  // Check if keystream is related to UA
  let uaMatchesFooter = 0;
  for (let i = 0; i < keystreamFooter.length; i++) {
    if (keystreamFooter[i] === uaBytes[i % uaBytes.length]) uaMatchesFooter++;
  }
  console.log(`Keystream matches UA: ${uaMatchesFooter}/${keystreamFooter.length}`);
  
  // Try RC4 with UA
  let rc4MatchesFooter = 0;
  for (let i = 0; i < keystreamFooter.length; i++) {
    if (rc4Ks[i] === keystreamFooter[i]) rc4MatchesFooter++;
  }
  console.log(`Keystream matches RC4(UA): ${rc4MatchesFooter}/${keystreamFooter.length}`);
  
  // Compare the two keystrams
  console.log('\n=== Comparing keystrams ===');
  let sameBytes = 0;
  for (let i = 0; i < keystreamHeader.length; i++) {
    if (keystreamHeader[i] === keystreamFooter[i]) sameBytes++;
  }
  console.log(`Same bytes: ${sameBytes}/${keystreamHeader.length}`);
  
  // The original analysis showed the keystream from the full data (no header/footer removal)
  // Let's compare with that
  console.log('\n=== Original keystream (no removal) ===');
  const keystreamOriginal = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystreamOriginal.push(encBytes[i] ^ decBytes[i]);
  }
  console.log('Keystream (first 32):', Buffer.from(keystreamOriginal.slice(0, 32)).toString('hex'));
  
  // This is the keystream we extracted earlier: deb74f5a9861ebac7dbaf84c93b2947e55047fd28c0786650d9b6f84d57538d0
  // Let's see if it matches the header-removed version
  let matchesOriginal = 0;
  for (let i = 0; i < keystreamOriginal.length; i++) {
    if (keystreamOriginal[i] === keystreamHeader[i]) matchesOriginal++;
  }
  console.log(`Original matches header-removed: ${matchesOriginal}/${keystreamOriginal.length}`);
  
  // The original keystream works! So the encryption is:
  // encrypted[i] = decrypted[i] XOR keystream[i]
  // where keystream is derived from UA somehow
  
  // Let's try to find the keystream derivation
  console.log('\n=== Analyzing keystream derivation ===');
  
  // The keystream is: deb74f5a9861ebac7dbaf84c93b2947e55047fd28c0786650d9b6f84d57538d0...
  // UA is: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...
  
  // Try various transformations
  const transformations = [
    { name: 'UA', data: Buffer.from(ua) },
    { name: 'MD5(UA)', data: crypto.createHash('md5').update(ua).digest() },
    { name: 'SHA1(UA)', data: crypto.createHash('sha1').update(ua).digest() },
    { name: 'SHA256(UA)', data: crypto.createHash('sha256').update(ua).digest() },
  ];
  
  for (const { name, data } of transformations) {
    // Check if keystream starts with this
    let matches = 0;
    for (let i = 0; i < Math.min(data.length, keystreamOriginal.length); i++) {
      if (data[i] === keystreamOriginal[i]) matches++;
    }
    console.log(`${name}: ${matches}/${Math.min(data.length, keystreamOriginal.length)} matches at start`);
  }
  
  // Try to find if keystream is a hash chain
  console.log('\n=== Testing hash chain ===');
  
  // MD5 chain: MD5(UA) || MD5(MD5(UA)) || MD5(MD5(MD5(UA))) || ...
  let hashChain = Buffer.alloc(0);
  let currentHash = Buffer.from(ua);
  while (hashChain.length < keystreamOriginal.length) {
    currentHash = crypto.createHash('md5').update(currentHash).digest();
    hashChain = Buffer.concat([hashChain, currentHash]);
  }
  
  let hashChainMatches = 0;
  for (let i = 0; i < keystreamOriginal.length; i++) {
    if (hashChain[i] === keystreamOriginal[i]) hashChainMatches++;
  }
  console.log(`MD5 hash chain: ${hashChainMatches}/${keystreamOriginal.length} matches`);
  
  // SHA256 chain
  hashChain = Buffer.alloc(0);
  currentHash = Buffer.from(ua);
  while (hashChain.length < keystreamOriginal.length) {
    currentHash = crypto.createHash('sha256').update(currentHash).digest();
    hashChain = Buffer.concat([hashChain, currentHash]);
  }
  
  hashChainMatches = 0;
  for (let i = 0; i < keystreamOriginal.length; i++) {
    if (hashChain[i] === keystreamOriginal[i]) hashChainMatches++;
  }
  console.log(`SHA256 hash chain: ${hashChainMatches}/${keystreamOriginal.length} matches`);
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
