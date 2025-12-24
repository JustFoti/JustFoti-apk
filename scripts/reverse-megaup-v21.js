#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v21
 * 
 * Something is wrong with our analysis. Let me verify the data more carefully.
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
    
    data.push({ videoId, encBytes, decBytes, encrypted, decrypted });
  }
  
  console.log('=== Raw data verification ===');
  console.log('Video 1 decrypted:', data[0].decrypted.substring(0, 100));
  console.log('Video 2 decrypted:', data[1].decrypted.substring(0, 100));
  
  // Find where decrypted strings differ
  let firstDiff = -1;
  for (let i = 0; i < Math.min(data[0].decrypted.length, data[1].decrypted.length); i++) {
    if (data[0].decrypted[i] !== data[1].decrypted[i]) {
      firstDiff = i;
      break;
    }
  }
  console.log(`\nDecrypted strings first differ at position: ${firstDiff}`);
  console.log(`Video 1 around diff: "${data[0].decrypted.substring(firstDiff - 5, firstDiff + 10)}"`);
  console.log(`Video 2 around diff: "${data[1].decrypted.substring(firstDiff - 5, firstDiff + 10)}"`);
  
  // Now let's look at the encrypted bytes around this position
  console.log('\n=== Encrypted bytes around first difference ===');
  for (let i = firstDiff - 5; i < firstDiff + 10; i++) {
    if (i < 0) continue;
    const enc1 = data[0].encBytes[i];
    const enc2 = data[1].encBytes[i];
    const dec1 = data[0].decBytes[i];
    const dec2 = data[1].decBytes[i];
    const ks1 = enc1 ^ dec1;
    const ks2 = enc2 ^ dec2;
    
    console.log(`[${i}] enc1=${enc1.toString(16).padStart(2, '0')} enc2=${enc2.toString(16).padStart(2, '0')} | dec1=${dec1.toString(16).padStart(2, '0')}('${String.fromCharCode(dec1)}') dec2=${dec2.toString(16).padStart(2, '0')}('${String.fromCharCode(dec2)}') | ks1=${ks1.toString(16).padStart(2, '0')} ks2=${ks2.toString(16).padStart(2, '0')}`);
  }
  
  // The key insight: if enc1 != enc2 at position i, then the keystream might still be the same
  // Let's check if enc1 XOR dec1 == enc2 XOR dec2 (same keystream)
  
  console.log('\n=== Keystream comparison ===');
  let sameKs = 0;
  let diffKs = 0;
  for (let i = 0; i < Math.min(data[0].encBytes.length, data[1].encBytes.length, data[0].decBytes.length, data[1].decBytes.length); i++) {
    const ks1 = data[0].encBytes[i] ^ data[0].decBytes[i];
    const ks2 = data[1].encBytes[i] ^ data[1].decBytes[i];
    if (ks1 === ks2) {
      sameKs++;
    } else {
      diffKs++;
      if (diffKs <= 10) {
        console.log(`Keystream differs at position ${i}: ks1=${ks1.toString(16)} ks2=${ks2.toString(16)}`);
      }
    }
  }
  console.log(`\nSame keystream: ${sameKs}, Different: ${diffKs}`);
}

main().catch(console.error);
