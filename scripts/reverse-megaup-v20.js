#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v20
 * 
 * Key finding: Keystrams diverge at position 33, but ciphertext at position 32 is the same.
 * This means the keystream depends on the PLAINTEXT, not the ciphertext!
 * 
 * This is characteristic of a cipher where:
 * keystream[i] = f(plaintext[i-1]) or f(keystream[i-1] XOR plaintext[i-1])
 * 
 * Let's verify this hypothesis.
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
  // Get two different videos
  const videoIds = ['jIrrLzj-WS2JcOLzF79O5xvpCQ', 'k5OoeWapWS2JcOLzF79O5xvpCQ'];
  const baseUrl = 'https://megaup22.online';
  
  const data = [];
  
  for (const videoId of videoIds) {
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
    });
    const mediaData = await mediaResponse.json();
    const encrypted = mediaData.result;
    
    const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    const decResult = await testDecryption(encrypted, ua);
    const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
    const decBytes = Buffer.from(decrypted, 'utf8');
    
    const keystream = [];
    for (let i = 0; i < decBytes.length; i++) {
      keystream.push(encBytes[i] ^ decBytes[i]);
    }
    
    data.push({ videoId, encBytes, decBytes, keystream });
  }
  
  console.log('=== Analyzing plaintext dependency ===');
  
  // Find where keystrams diverge
  let divergeAt = -1;
  for (let i = 0; i < Math.min(data[0].keystream.length, data[1].keystream.length); i++) {
    if (data[0].keystream[i] !== data[1].keystream[i]) {
      divergeAt = i;
      break;
    }
  }
  console.log(`Keystrams diverge at position: ${divergeAt}`);
  
  // Check plaintext at position divergeAt - 1
  console.log(`\nPlaintext at position ${divergeAt - 1}:`);
  console.log(`  Video 1: ${data[0].decBytes[divergeAt - 1]} (0x${data[0].decBytes[divergeAt - 1].toString(16)}) = '${String.fromCharCode(data[0].decBytes[divergeAt - 1])}'`);
  console.log(`  Video 2: ${data[1].decBytes[divergeAt - 1]} (0x${data[1].decBytes[divergeAt - 1].toString(16)}) = '${String.fromCharCode(data[1].decBytes[divergeAt - 1])}'`);
  
  // Check if plaintext differs at position divergeAt - 1
  if (data[0].decBytes[divergeAt - 1] !== data[1].decBytes[divergeAt - 1]) {
    console.log('  -> Plaintexts differ! This confirms plaintext feedback.');
  }
  
  // Let's look at the plaintext around the divergence point
  console.log(`\nPlaintext around divergence:`);
  console.log(`  Video 1: "${data[0].decBytes.slice(divergeAt - 5, divergeAt + 5).toString()}"`);
  console.log(`  Video 2: "${data[1].decBytes.slice(divergeAt - 5, divergeAt + 5).toString()}"`);
  
  // Now let's try to understand the feedback mechanism
  console.log('\n=== Analyzing feedback mechanism ===');
  
  // If keystream[i] depends on plaintext[i-1], then:
  // keystream[i] = f(UA, i, plaintext[0:i-1])
  
  // Let's check if the keystream can be computed incrementally
  // by looking at the relationship between consecutive keystream bytes
  
  for (let i = divergeAt - 2; i <= divergeAt + 2; i++) {
    if (i < 0 || i >= data[0].keystream.length) continue;
    
    const ks1 = data[0].keystream[i];
    const ks2 = data[1].keystream[i];
    const pt1 = i > 0 ? data[0].decBytes[i - 1] : 0;
    const pt2 = i > 0 ? data[1].decBytes[i - 1] : 0;
    const ct1 = data[0].encBytes[i];
    const ct2 = data[1].encBytes[i];
    
    console.log(`Position ${i}:`);
    console.log(`  ks1=${ks1.toString(16).padStart(2, '0')} ks2=${ks2.toString(16).padStart(2, '0')} diff=${(ks1 ^ ks2).toString(16).padStart(2, '0')}`);
    console.log(`  pt1=${pt1.toString(16).padStart(2, '0')} pt2=${pt2.toString(16).padStart(2, '0')} diff=${(pt1 ^ pt2).toString(16).padStart(2, '0')}`);
    console.log(`  ct1=${ct1.toString(16).padStart(2, '0')} ct2=${ct2.toString(16).padStart(2, '0')} diff=${(ct1 ^ ct2).toString(16).padStart(2, '0')}`);
  }
  
  // Let's try to find the exact feedback function
  console.log('\n=== Testing feedback functions ===');
  
  // Hypothesis 1: keystream[i] = keystream[i-1] XOR plaintext[i-1]
  // Hypothesis 2: keystream[i] = f(keystream[i-1], plaintext[i-1])
  // Hypothesis 3: keystream[i] = S-box[keystream[i-1] XOR plaintext[i-1]]
  
  // Test hypothesis 1
  let h1Matches = 0;
  for (let i = 1; i < data[0].keystream.length; i++) {
    const expected = data[0].keystream[i - 1] ^ data[0].decBytes[i - 1];
    if (expected === data[0].keystream[i]) h1Matches++;
  }
  console.log(`Hypothesis 1 (ks[i] = ks[i-1] XOR pt[i-1]): ${h1Matches}/${data[0].keystream.length - 1} matches`);
  
  // Test hypothesis 2: keystream[i] = (keystream[i-1] + plaintext[i-1]) mod 256
  let h2Matches = 0;
  for (let i = 1; i < data[0].keystream.length; i++) {
    const expected = (data[0].keystream[i - 1] + data[0].decBytes[i - 1]) & 0xFF;
    if (expected === data[0].keystream[i]) h2Matches++;
  }
  console.log(`Hypothesis 2 (ks[i] = (ks[i-1] + pt[i-1]) mod 256): ${h2Matches}/${data[0].keystream.length - 1} matches`);
  
  // Test hypothesis 3: keystream[i] = (keystream[i-1] - plaintext[i-1]) mod 256
  let h3Matches = 0;
  for (let i = 1; i < data[0].keystream.length; i++) {
    const expected = (data[0].keystream[i - 1] - data[0].decBytes[i - 1] + 256) & 0xFF;
    if (expected === data[0].keystream[i]) h3Matches++;
  }
  console.log(`Hypothesis 3 (ks[i] = (ks[i-1] - pt[i-1]) mod 256): ${h3Matches}/${data[0].keystream.length - 1} matches`);
}

main().catch(console.error);
