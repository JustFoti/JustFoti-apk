#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v29
 * 
 * Let's try to understand the cipher by testing with minimal UAs
 * and seeing how the keystream changes.
 */

const crypto = require('crypto');

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function getKeystreamForUA(ua) {
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  const decResult = await testDecryption(encrypted, ua);
  
  if (decResult.status !== 200) {
    return null;
  }
  
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  const keystream = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystream.push(encBytes[i] ^ decBytes[i]);
  }
  
  return keystream;
}

async function main() {
  // Test with different UAs to understand the relationship
  const testUAs = [
    'A',
    'AA',
    'AAA',
    'AAAA',
    'B',
    'AB',
    'BA',
    'Mozilla/5.0',
  ];
  
  console.log('=== Testing different UAs ===\n');
  
  const results = [];
  
  for (const ua of testUAs) {
    console.log(`Testing UA: "${ua}"`);
    const ks = await getKeystreamForUA(ua);
    
    if (ks) {
      console.log(`  Keystream[0:16]: ${Buffer.from(ks.slice(0, 16)).toString('hex')}`);
      results.push({ ua, ks });
    } else {
      console.log(`  Failed to decrypt`);
    }
  }
  
  // Compare keystrams
  console.log('\n=== Comparing keystrams ===\n');
  
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const r1 = results[i];
      const r2 = results[j];
      
      // Find first difference
      let firstDiff = -1;
      for (let k = 0; k < Math.min(r1.ks.length, r2.ks.length); k++) {
        if (r1.ks[k] !== r2.ks[k]) {
          firstDiff = k;
          break;
        }
      }
      
      if (firstDiff >= 0) {
        console.log(`"${r1.ua}" vs "${r2.ua}": first diff at position ${firstDiff}`);
      } else {
        console.log(`"${r1.ua}" vs "${r2.ua}": IDENTICAL keystrams!`);
      }
    }
  }
  
  // Analyze the relationship between UA and keystream
  console.log('\n=== Analyzing UA -> keystream relationship ===\n');
  
  if (results.length >= 2) {
    const r1 = results.find(r => r.ua === 'A');
    const r2 = results.find(r => r.ua === 'B');
    
    if (r1 && r2) {
      console.log('Comparing "A" vs "B":');
      console.log('UA "A" = 0x41');
      console.log('UA "B" = 0x42');
      console.log('Difference: 1');
      
      // Check how keystream differs
      for (let i = 0; i < 16; i++) {
        const k1 = r1.ks[i];
        const k2 = r2.ks[i];
        const diff = k1 ^ k2;
        console.log(`[${i}] ks_A=${k1.toString(16).padStart(2, '0')} ks_B=${k2.toString(16).padStart(2, '0')} xor=${diff.toString(16).padStart(2, '0')}`);
      }
    }
    
    const rAA = results.find(r => r.ua === 'AA');
    const rAB = results.find(r => r.ua === 'AB');
    
    if (rAA && rAB) {
      console.log('\nComparing "AA" vs "AB":');
      for (let i = 0; i < 16; i++) {
        const k1 = rAA.ks[i];
        const k2 = rAB.ks[i];
        const diff = k1 ^ k2;
        console.log(`[${i}] ks_AA=${k1.toString(16).padStart(2, '0')} ks_AB=${k2.toString(16).padStart(2, '0')} xor=${diff.toString(16).padStart(2, '0')}`);
      }
    }
  }
}

main().catch(console.error);
