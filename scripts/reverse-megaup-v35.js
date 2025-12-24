#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v35
 * 
 * The issue: our lookup tables were built with a DIFFERENT encrypted blob.
 * The encryption changes per request! We need to understand the relationship.
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
  
  // Get multiple encrypted samples with the SAME UA
  const ua = 'M';
  
  console.log('=== Testing if encryption is deterministic ===\n');
  
  const samples = [];
  for (let i = 0; i < 3; i++) {
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
    });
    const mediaData = await mediaResponse.json();
    samples.push(mediaData.result);
    console.log(`Sample ${i + 1}: ${mediaData.result.substring(0, 50)}...`);
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Check if they're the same
  const allSame = samples.every(s => s === samples[0]);
  console.log(`\nAll samples identical: ${allSame}`);
  
  if (!allSame) {
    // Compare byte by byte
    const bytes0 = Buffer.from(samples[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const bytes1 = Buffer.from(samples[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    let diffs = 0;
    for (let i = 0; i < Math.min(bytes0.length, bytes1.length); i++) {
      if (bytes0[i] !== bytes1[i]) {
        diffs++;
        if (diffs <= 10) {
          console.log(`Diff at ${i}: ${bytes0[i].toString(16)} vs ${bytes1[i].toString(16)}`);
        }
      }
    }
    console.log(`Total differences: ${diffs}/${bytes0.length}`);
  }
  
  // Now let's understand the structure better
  console.log('\n=== Analyzing encrypted structure ===\n');
  
  const encrypted = samples[0];
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  console.log('Encrypted bytes length:', encBytes.length);
  console.log('First 32 bytes:', encBytes.slice(0, 32).toString('hex'));
  
  // Get decrypted
  const decResult = await testDecryption(encrypted, ua);
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  console.log('Decrypted bytes length:', decBytes.length);
  console.log('First 32 decrypted bytes:', decBytes.slice(0, 32).toString('hex'));
  
  // Calculate keystream
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  console.log('Keystream first 32 bytes:', Buffer.from(keystream.slice(0, 32)).toString('hex'));
  
  // The encrypted data is longer than decrypted - what's in the extra bytes?
  const extraBytes = encBytes.length - decBytes.length;
  console.log(`\nExtra bytes in encrypted: ${extraBytes}`);
  console.log('Last 32 encrypted bytes:', encBytes.slice(-32).toString('hex'));
  
  // Check if the extra bytes are at the beginning or end
  // Try decrypting from different offsets
  console.log('\n=== Testing different offsets ===\n');
  
  for (let offset = 0; offset <= 20; offset++) {
    const testKs = [];
    for (let i = 0; i < decBytes.length; i++) {
      testKs.push(encBytes[i + offset] ^ decBytes[i]);
    }
    
    // Check if keystream looks "reasonable" (has patterns)
    const uniqueFirst10 = [...new Set(testKs.slice(0, 10))].length;
    console.log(`Offset ${offset}: first 10 ks unique values = ${uniqueFirst10}`);
  }
  
  // Let's also check if there's a header/IV
  console.log('\n=== Checking for IV/header ===\n');
  
  // Get another sample with different UA
  const ua2 = 'A';
  const mediaResponse2 = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua2, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData2 = await mediaResponse2.json();
  const encrypted2 = mediaData2.result;
  const encBytes2 = Buffer.from(encrypted2.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  console.log('UA "M" first 32:', encBytes.slice(0, 32).toString('hex'));
  console.log('UA "A" first 32:', encBytes2.slice(0, 32).toString('hex'));
  
  // XOR the two encrypted streams
  const xorEnc = [];
  for (let i = 0; i < Math.min(encBytes.length, encBytes2.length); i++) {
    xorEnc.push(encBytes[i] ^ encBytes2[i]);
  }
  console.log('XOR first 32:', Buffer.from(xorEnc.slice(0, 32)).toString('hex'));
  
  // If the plaintext is the same, XOR of encrypted = XOR of keystrams
  // Get decrypted for UA "A"
  const decResult2 = await testDecryption(encrypted2, ua2);
  const decrypted2 = typeof decResult2.result === 'string' ? decResult2.result : JSON.stringify(decResult2.result);
  
  console.log('\nDecrypted with "M":', decrypted.substring(0, 80));
  console.log('Decrypted with "A":', decrypted2.substring(0, 80));
  
  // Are they the same?
  console.log('\nDecrypted identical:', decrypted === decrypted2);
}

main().catch(console.error);
