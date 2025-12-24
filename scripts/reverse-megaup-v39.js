#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v39
 * 
 * The keystream depends on MORE than just the first character!
 * Let's find out exactly what parts of the UA affect the keystream.
 */

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function getKeystreamForUA(videoId, ua) {
  const baseUrl = 'https://megaup22.online';
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  
  if (!mediaResponse.ok) return null;
  
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  if (!encrypted) return null;
  
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  const decResult = await testDecryption(encrypted, ua);
  if (decResult.status !== 200) return null;
  
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  return keystream;
}

async function main() {
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  
  console.log('=== Testing UA length dependency ===\n');
  
  // Test UAs of different lengths, all starting with 'M'
  const testUAs = [
    'M',
    'Mo',
    'Moz',
    'Mozi',
    'Mozil',
    'Mozill',
    'Mozilla',
    'Mozilla/',
    'Mozilla/5',
    'Mozilla/5.',
    'Mozilla/5.0',
    'Mozilla/5.0 ',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  ];
  
  const keystrams = {};
  
  for (const ua of testUAs) {
    process.stdout.write(`Testing "${ua.substring(0, 20)}${ua.length > 20 ? '...' : ''}"... `);
    const ks = await getKeystreamForUA(videoId, ua);
    
    if (ks) {
      keystrams[ua] = ks;
      console.log(`OK (${ks.length} bytes)`);
    } else {
      console.log('FAILED');
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Compare keystrams
  console.log('\n=== Comparing keystrams ===\n');
  
  const baseUA = 'M';
  const baseKs = keystrams[baseUA];
  
  if (!baseKs) {
    console.log('No base keystream');
    return;
  }
  
  for (const ua of testUAs) {
    if (ua === baseUA) continue;
    
    const ks = keystrams[ua];
    if (!ks) continue;
    
    // Count differences
    let diffs = 0;
    const diffPositions = [];
    for (let i = 0; i < Math.min(baseKs.length, ks.length); i++) {
      if (baseKs[i] !== ks[i]) {
        diffs++;
        if (diffPositions.length < 10) {
          diffPositions.push(i);
        }
      }
    }
    
    console.log(`"${ua.substring(0, 15).padEnd(15)}": ${diffs} diffs at positions ${diffPositions.join(', ')}${diffs > 10 ? '...' : ''}`);
  }
  
  // Now let's find which character positions in the UA affect which keystream positions
  console.log('\n=== Finding UA character -> keystream position mapping ===\n');
  
  // Test by changing one character at a time
  const baseUA2 = 'MMMMMMMMMM'; // 10 M's
  const baseKs2 = await getKeystreamForUA(videoId, baseUA2);
  
  if (!baseKs2) {
    console.log('Failed to get base keystream');
    return;
  }
  
  console.log(`Base UA: "${baseUA2}"`);
  
  for (let charPos = 0; charPos < 10; charPos++) {
    // Change character at position charPos to 'A'
    const testUA = baseUA2.substring(0, charPos) + 'A' + baseUA2.substring(charPos + 1);
    const testKs = await getKeystreamForUA(videoId, testUA);
    
    if (!testKs) {
      console.log(`Position ${charPos}: FAILED`);
      continue;
    }
    
    // Find which keystream positions changed
    const changedPositions = [];
    for (let i = 0; i < Math.min(baseKs2.length, testKs.length); i++) {
      if (baseKs2[i] !== testKs[i]) {
        changedPositions.push(i);
      }
    }
    
    console.log(`UA char ${charPos}: ${changedPositions.length} ks positions changed: ${changedPositions.slice(0, 20).join(', ')}${changedPositions.length > 20 ? '...' : ''}`);
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Let's also check if the UA length matters
  console.log('\n=== Testing UA length effect ===\n');
  
  const lengthTests = [
    'A',
    'AA',
    'AAA',
    'AAAA',
    'AAAAA',
    'AAAAAA',
    'AAAAAAA',
    'AAAAAAAA',
    'AAAAAAAAA',
    'AAAAAAAAAA'
  ];
  
  const ksA = await getKeystreamForUA(videoId, 'A');
  
  for (const ua of lengthTests) {
    if (ua === 'A') continue;
    
    const ks = await getKeystreamForUA(videoId, ua);
    if (!ks) continue;
    
    let diffs = 0;
    for (let i = 0; i < Math.min(ksA.length, ks.length); i++) {
      if (ksA[i] !== ks[i]) diffs++;
    }
    
    console.log(`"${ua}": ${diffs} diffs from "A"`);
    
    await new Promise(r => setTimeout(r, 300));
  }
}

main().catch(console.error);
