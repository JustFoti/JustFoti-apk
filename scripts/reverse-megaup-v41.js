#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v41
 * 
 * The encrypted data changes slightly between requests.
 * Let's understand the exact relationship and build a working decryptor.
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
  
  console.log('=== Testing encryption consistency ===\n');
  
  // Get multiple encrypted samples with the same UA
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
    });
    const mediaData = await mediaResponse.json();
    samples.push(mediaData.result);
    console.log(`Sample ${i + 1}: ${mediaData.result.substring(0, 30)}...`);
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Check if they're identical
  const allSame = samples.every(s => s === samples[0]);
  console.log(`\nAll samples identical: ${allSame}`);
  
  if (!allSame) {
    // Find differences
    const bytes0 = Buffer.from(samples[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const bytes1 = Buffer.from(samples[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    const diffs = [];
    for (let i = 0; i < Math.min(bytes0.length, bytes1.length); i++) {
      if (bytes0[i] !== bytes1[i]) {
        diffs.push({ pos: i, v0: bytes0[i], v1: bytes1[i] });
      }
    }
    
    console.log(`Differences: ${diffs.length}`);
    for (const d of diffs.slice(0, 10)) {
      console.log(`  Position ${d.pos}: ${d.v0.toString(16)} vs ${d.v1.toString(16)}`);
    }
  }
  
  // Now let's understand the keystream derivation
  console.log('\n=== Deriving keystream formula ===\n');
  
  // Get fresh encrypted data
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  // Get decrypted from API
  const decResult = await testDecryption(encrypted, ua);
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  console.log('Encrypted length:', encBytes.length);
  console.log('Decrypted length:', decBytes.length);
  
  // Calculate keystream
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  console.log('Keystream (first 50):', keystream.slice(0, 50).map(k => k.toString(16).padStart(2, '0')).join(' '));
  
  // The keystream should be deterministic for a given UA
  // Let's verify by getting another encrypted sample and checking if the keystream is the same
  
  console.log('\n=== Verifying keystream consistency ===\n');
  
  const mediaResponse2 = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData2 = await mediaResponse2.json();
  const encrypted2 = mediaData2.result;
  const encBytes2 = Buffer.from(encrypted2.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  const decResult2 = await testDecryption(encrypted2, ua);
  const decrypted2 = typeof decResult2.result === 'string' ? decResult2.result : JSON.stringify(decResult2.result);
  const decBytes2 = Buffer.from(decrypted2, 'utf8');
  
  const keystream2 = [];
  for (let i = 0; i < decBytes2.length; i++) {
    keystream2.push(encBytes2[i] ^ decBytes2[i]);
  }
  
  console.log('Keystream2 (first 50):', keystream2.slice(0, 50).map(k => k.toString(16).padStart(2, '0')).join(' '));
  
  // Compare keystrams
  let ksDiffs = 0;
  for (let i = 0; i < Math.min(keystream.length, keystream2.length); i++) {
    if (keystream[i] !== keystream2[i]) ksDiffs++;
  }
  console.log(`Keystream differences: ${ksDiffs}`);
  
  if (ksDiffs === 0) {
    console.log('\n*** KEYSTREAM IS CONSISTENT! ***');
    console.log('We can use a fixed keystream for a given UA.');
    
    // Save the keystream
    const fs = require('fs');
    fs.writeFileSync('megaup-keystream-final.json', JSON.stringify({
      ua,
      keystream,
      encryptedLength: encBytes.length,
      decryptedLength: decBytes.length
    }));
    console.log('\nSaved keystream to megaup-keystream-final.json');
    
    // Generate TypeScript code
    console.log('\n=== Generating TypeScript decryption code ===\n');
    
    // Compress the keystream using run-length encoding or similar
    // For now, just output the raw keystream as a hex string
    const ksHex = Buffer.from(keystream).toString('hex');
    console.log(`Keystream hex (${ksHex.length} chars):`);
    console.log(ksHex.substring(0, 200) + '...');
    
    // Generate the decryption function
    const code = `
// MegaUp decryption keystream for UA: ${ua}
const MEGAUP_KEYSTREAM = Buffer.from('${ksHex}', 'hex');

export function decryptMegaUp(encryptedBase64: string): string {
  // Convert from URL-safe base64
  const base64 = encryptedBase64.replace(/-/g, '+').replace(/_/g, '/');
  const encBytes = Buffer.from(base64, 'base64');
  
  // XOR with keystream
  const decBytes = Buffer.alloc(MEGAUP_KEYSTREAM.length);
  for (let i = 0; i < MEGAUP_KEYSTREAM.length && i < encBytes.length; i++) {
    decBytes[i] = encBytes[i] ^ MEGAUP_KEYSTREAM[i];
  }
  
  return decBytes.toString('utf8');
}
`;
    
    console.log(code);
  } else {
    console.log('\nKeystream varies between requests. Need to investigate further.');
    
    // Find which positions differ
    const diffPositions = [];
    for (let i = 0; i < Math.min(keystream.length, keystream2.length); i++) {
      if (keystream[i] !== keystream2[i]) {
        diffPositions.push(i);
      }
    }
    console.log(`Diff positions: ${diffPositions.join(', ')}`);
  }
}

main().catch(console.error);
