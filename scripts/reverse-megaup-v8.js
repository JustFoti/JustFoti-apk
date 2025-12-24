#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v8
 * 
 * Test with different User-Agents to understand how the keystream is derived.
 */

const crypto = require('crypto');

const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
const baseUrl = 'https://megaup22.online';

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'TestAgent/1.0',
];

async function getKeystreamForUA(ua) {
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
  
  if (decResult.status !== 200) {
    return { error: decResult.error || 'Decryption failed' };
  }
  
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  
  // Decode base64
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  // Extract keystream
  const keystream = [];
  for (let i = 0; i < Math.min(encBytes.length, decBytes.length); i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  return { keystream, encrypted, decrypted };
}

async function main() {
  const results = [];
  
  for (const ua of userAgents) {
    console.log(`\nTesting UA: ${ua.substring(0, 50)}...`);
    const result = await getKeystreamForUA(ua);
    
    if (result.error) {
      console.log(`  Error: ${result.error}`);
      continue;
    }
    
    console.log(`  Keystream (first 32 bytes): ${Buffer.from(result.keystream.slice(0, 32)).toString('hex')}`);
    results.push({ ua, keystream: result.keystream });
  }
  
  // Compare keystrams
  console.log('\n--- Comparing keystrams ---');
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      let matches = 0;
      const len = Math.min(results[i].keystream.length, results[j].keystream.length);
      for (let k = 0; k < len; k++) {
        if (results[i].keystream[k] === results[j].keystream[k]) matches++;
      }
      console.log(`UA ${i} vs UA ${j}: ${matches}/${len} matches (${(matches/len*100).toFixed(1)}%)`);
    }
  }
  
  // If keystrams are different, try to find the relationship with UA
  if (results.length >= 2) {
    console.log('\n--- Analyzing keystream derivation ---');
    
    // Try RC4 with different key derivations
    for (const { ua, keystream } of results) {
      console.log(`\nUA: ${ua.substring(0, 40)}...`);
      
      const keyDerivations = [
        { name: 'UA', key: ua },
        { name: 'MD5(UA) hex', key: crypto.createHash('md5').update(ua).digest('hex') },
        { name: 'MD5(UA) binary', key: crypto.createHash('md5').update(ua).digest().toString('binary') },
        { name: 'SHA1(UA) hex', key: crypto.createHash('sha1').update(ua).digest('hex') },
        { name: 'SHA256(UA) hex', key: crypto.createHash('sha256').update(ua).digest('hex') },
      ];
      
      for (const { name, key } of keyDerivations) {
        const rc4Ks = generateRC4Keystream(key, keystream.length);
        let matches = 0;
        for (let i = 0; i < keystream.length; i++) {
          if (rc4Ks[i] === keystream[i]) matches++;
        }
        if (matches > keystream.length * 0.01) {
          console.log(`  RC4(${name}): ${matches}/${keystream.length} (${(matches/keystream.length*100).toFixed(1)}%)`);
        }
      }
    }
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
