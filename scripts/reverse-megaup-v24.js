#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v24
 * 
 * Key insight: Keystrams are identical up to position 32, diverge at 33
 * But plaintext at position 32 is the SAME for both samples!
 * 
 * This means the state depends on plaintext BEFORE position 32.
 * Let's find where the plaintexts first differ.
 */

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
  const videoIds = [
    'jIrrLzj-WS2JcOLzF79O5xvpCQ',
    'k5OoeWapWS2JcOLzF79O5xvpCQ',
  ];
  const baseUrl = 'https://megaup22.online';
  
  const samples = [];
  
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
    
    samples.push({ encBytes, decBytes, decrypted });
  }
  
  console.log('Sample 0:', samples[0].decrypted.substring(0, 80));
  console.log('Sample 1:', samples[1].decrypted.substring(0, 80));
  
  // Find where plaintexts first differ
  let firstDiff = -1;
  for (let i = 0; i < Math.min(samples[0].decBytes.length, samples[1].decBytes.length); i++) {
    if (samples[0].decBytes[i] !== samples[1].decBytes[i]) {
      firstDiff = i;
      break;
    }
  }
  console.log(`\nPlaintexts first differ at position: ${firstDiff}`);
  console.log(`Sample 0 around diff: "${samples[0].decrypted.substring(firstDiff - 5, firstDiff + 15)}"`);
  console.log(`Sample 1 around diff: "${samples[1].decrypted.substring(firstDiff - 5, firstDiff + 15)}"`);
  
  // Extract keystrams
  const ks0 = samples[0].encBytes.slice(0, samples[0].decBytes.length).map((b, i) => b ^ samples[0].decBytes[i]);
  const ks1 = samples[1].encBytes.slice(0, samples[1].decBytes.length).map((b, i) => b ^ samples[1].decBytes[i]);
  
  // Find where keystrams first differ
  let ksDiff = -1;
  for (let i = 0; i < Math.min(ks0.length, ks1.length); i++) {
    if (ks0[i] !== ks1[i]) {
      ksDiff = i;
      break;
    }
  }
  console.log(`\nKeystrams first differ at position: ${ksDiff}`);
  
  // The keystream diverges AFTER the plaintext diverges
  // Delay = ksDiff - firstDiff
  const delay = ksDiff - firstDiff;
  console.log(`Delay between plaintext diff and keystream diff: ${delay} positions`);
  
  // This suggests the state update has a delay!
  // state[i] might depend on plaintext[i - delay]
  
  console.log('\n=== Detailed analysis around divergence ===');
  for (let i = firstDiff - 2; i < ksDiff + 5; i++) {
    if (i < 0 || i >= ks0.length || i >= ks1.length) continue;
    
    const pt0 = samples[0].decBytes[i];
    const pt1 = samples[1].decBytes[i];
    const ptSame = pt0 === pt1 ? '=' : '!';
    
    const k0 = ks0[i];
    const k1 = ks1[i];
    const ksSame = k0 === k1 ? '=' : '!';
    
    console.log(`[${i}] pt: ${pt0.toString(16).padStart(2, '0')} ${ptSame} ${pt1.toString(16).padStart(2, '0')} | ks: ${k0.toString(16).padStart(2, '0')} ${ksSame} ${k1.toString(16).padStart(2, '0')} | char: '${String.fromCharCode(pt0)}' ${ptSame} '${String.fromCharCode(pt1)}'`);
  }
  
  // Now let's try to model this with a delayed feedback
  console.log('\n=== Testing delayed feedback models ===');
  
  for (let delayTest = 0; delayTest <= 5; delayTest++) {
    // Model: keystream[i] depends on plaintext[i - delay]
    // Try to find an S-box that maps (position, delayed_plaintext) -> keystream
    
    const sbox = {}; // Map from "pos_mod_N:pt" to keystream
    let conflicts = 0;
    let entries = 0;
    
    for (const sample of samples) {
      for (let i = 0; i < sample.decBytes.length; i++) {
        const ks = sample.encBytes[i] ^ sample.decBytes[i];
        const delayedPt = i >= delayTest ? sample.decBytes[i - delayTest] : 0;
        
        // Try different state formulas
        const state = (i + delayedPt) & 0xFF;
        const key = `${state}`;
        
        if (!(key in sbox)) {
          sbox[key] = ks;
          entries++;
        } else if (sbox[key] !== ks) {
          conflicts++;
        }
      }
    }
    
    console.log(`Delay ${delayTest}: ${conflicts} conflicts, ${entries} entries`);
  }
  
  // Let's try a cumulative model with delay
  console.log('\n=== Testing cumulative models with delay ===');
  
  for (let delayTest = 0; delayTest <= 5; delayTest++) {
    const sbox = {};
    let conflicts = 0;
    let entries = 0;
    
    for (const sample of samples) {
      let sum = 0;
      const history = [];
      
      for (let i = 0; i < sample.decBytes.length; i++) {
        const ks = sample.encBytes[i] ^ sample.decBytes[i];
        
        // State is cumulative sum of plaintext with delay
        const state = sum & 0xFF;
        const key = `${state}`;
        
        if (!(key in sbox)) {
          sbox[key] = ks;
          entries++;
        } else if (sbox[key] !== ks) {
          conflicts++;
        }
        
        // Update sum with delayed plaintext
        history.push(sample.decBytes[i]);
        if (history.length > delayTest) {
          sum = (sum + history[history.length - 1 - delayTest]) & 0xFF;
        }
      }
    }
    
    console.log(`Cumulative delay ${delayTest}: ${conflicts} conflicts, ${entries} entries`);
  }
}

main().catch(console.error);
