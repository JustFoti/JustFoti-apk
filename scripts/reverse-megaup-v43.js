#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v43
 * 
 * The last few bytes vary. Let's understand why and fix it.
 * The decrypted JSON should end with "}}" so we can detect the correct ending.
 */

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function main() {
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  
  console.log('=== Analyzing tail bytes ===\n');
  
  // Get multiple samples and analyze the tail
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
    });
    const mediaData = await mediaResponse.json();
    const encrypted = mediaData.result;
    const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    const decResult = await testDecryption(encrypted, ua);
    const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
    const decBytes = Buffer.from(decrypted, 'utf8');
    
    // Calculate keystream
    const keystream = [];
    for (let j = 0; j < decBytes.length; j++) {
      keystream.push(encBytes[j] ^ decBytes[j]);
    }
    
    samples.push({
      encrypted,
      decrypted,
      encBytes,
      decBytes,
      keystream
    });
    
    console.log(`Sample ${i + 1}:`);
    console.log(`  Decrypted tail: "${decrypted.substring(decrypted.length - 20)}"`);
    console.log(`  Keystream tail: ${keystream.slice(-10).map(k => k.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`  Enc tail: ${encBytes.slice(-10).map(k => k.toString(16).padStart(2, '0')).join(' ')}`);
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Compare keystrams
  console.log('\n=== Comparing keystrams ===\n');
  
  const ks0 = samples[0].keystream;
  for (let i = 1; i < samples.length; i++) {
    const ks = samples[i].keystream;
    
    let diffs = 0;
    const diffPositions = [];
    for (let j = 0; j < Math.min(ks0.length, ks.length); j++) {
      if (ks0[j] !== ks[j]) {
        diffs++;
        diffPositions.push(j);
      }
    }
    
    console.log(`Sample ${i + 1} vs Sample 1: ${diffs} diffs at positions ${diffPositions.join(', ')}`);
  }
  
  // The keystream should be consistent except for the tail
  // Let's find the stable portion
  
  console.log('\n=== Finding stable keystream portion ===\n');
  
  let stableEnd = ks0.length;
  for (let pos = ks0.length - 1; pos >= 0; pos--) {
    let allSame = true;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].keystream[pos] !== ks0[pos]) {
        allSame = false;
        break;
      }
    }
    if (allSame) {
      stableEnd = pos + 1;
      break;
    }
  }
  
  console.log(`Stable keystream ends at position ${stableEnd}`);
  console.log(`Total keystream length: ${ks0.length}`);
  console.log(`Unstable tail: ${ks0.length - stableEnd} bytes`);
  
  // The decrypted JSON should end with "}}" or similar
  // We can use this to validate the decryption
  
  console.log('\n=== Analyzing decrypted structure ===\n');
  
  for (let i = 0; i < samples.length; i++) {
    const dec = samples[i].decrypted;
    console.log(`Sample ${i + 1}: ends with "${dec.substring(dec.length - 10)}"`);
    
    // Find the last valid JSON position
    for (let j = dec.length; j > dec.length - 20; j--) {
      try {
        JSON.parse(dec.substring(0, j));
        console.log(`  Valid JSON up to position ${j}`);
        break;
      } catch {}
    }
  }
  
  // The solution: truncate at the last "}}" or use the stable keystream portion
  console.log('\n=== Building robust decryption ===\n');
  
  // Use the stable keystream (up to position stableEnd - some buffer)
  const safeEnd = stableEnd - 10; // Leave some buffer
  const stableKeystream = ks0.slice(0, safeEnd);
  
  console.log(`Using stable keystream of ${stableKeystream.length} bytes`);
  
  // Test decryption with stable keystream
  const testEnc = samples[0].encBytes;
  const testDec = [];
  for (let i = 0; i < stableKeystream.length && i < testEnc.length; i++) {
    testDec.push(testEnc[i] ^ stableKeystream[i]);
  }
  
  const testDecStr = Buffer.from(testDec).toString('utf8');
  console.log('Decrypted with stable keystream:', testDecStr.substring(0, 100));
  console.log('Ends with:', testDecStr.substring(testDecStr.length - 30));
  
  // Find the last complete JSON
  let lastValidJson = '';
  for (let i = testDecStr.length; i > 0; i--) {
    try {
      JSON.parse(testDecStr.substring(0, i));
      lastValidJson = testDecStr.substring(0, i);
      break;
    } catch {}
  }
  
  if (lastValidJson) {
    console.log('\nValid JSON found!');
    console.log('Length:', lastValidJson.length);
    console.log('Ends with:', lastValidJson.substring(lastValidJson.length - 20));
    
    const parsed = JSON.parse(lastValidJson);
    console.log('Sources:', parsed.sources?.length);
    console.log('Tracks:', parsed.tracks?.length);
  }
  
  // Save the final keystream
  const fs = require('fs');
  
  // Actually, let's use the full keystream but handle the tail specially
  // The tail variation is small, so we can just truncate at the last valid JSON
  
  const fullKeystream = ks0;
  fs.writeFileSync('megaup-keystream-v2.json', JSON.stringify({
    ua,
    keystream: fullKeystream,
    stableEnd,
    note: 'Keystream is stable up to position ' + stableEnd + '. Truncate decrypted output at last valid JSON.'
  }));
  
  console.log('\nSaved keystream to megaup-keystream-v2.json');
  
  // Generate the final decryption code
  const ksHex = Buffer.from(fullKeystream).toString('hex');
  
  console.log('\n=== Final TypeScript Code ===\n');
  console.log(`
// MegaUp native decryption
// UA: ${ua}
const MEGAUP_KEYSTREAM = Buffer.from('${ksHex}', 'hex');

export function decryptMegaUp(encryptedBase64: string): string {
  const base64 = encryptedBase64.replace(/-/g, '+').replace(/_/g, '/');
  const encBytes = Buffer.from(base64, 'base64');
  
  const decBytes = Buffer.alloc(Math.min(MEGAUP_KEYSTREAM.length, encBytes.length));
  for (let i = 0; i < decBytes.length; i++) {
    decBytes[i] = encBytes[i] ^ MEGAUP_KEYSTREAM[i];
  }
  
  let result = decBytes.toString('utf8');
  
  // Find the last valid JSON (handles tail variation)
  for (let i = result.length; i > 0; i--) {
    try {
      JSON.parse(result.substring(0, i));
      return result.substring(0, i);
    } catch {}
  }
  
  return result;
}
`);
}

main().catch(console.error);
