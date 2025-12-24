#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v30
 * 
 * BREAKTHROUGH: The keystream depends primarily on the FIRST CHARACTER of the UA!
 * 
 * Let's verify this and build a lookup table.
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
  
  return { keystream, decrypted };
}

async function main() {
  // Test with single-character UAs to build a lookup table
  const testChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  console.log('=== Building keystream lookup table ===\n');
  
  const keystreamByFirstChar = {};
  
  for (const char of testChars) {
    console.log(`Testing UA: "${char}"`);
    const result = await getKeystreamForUA(char);
    
    if (result) {
      keystreamByFirstChar[char] = result.keystream;
      console.log(`  Keystream[0:8]: ${Buffer.from(result.keystream.slice(0, 8)).toString('hex')}`);
    } else {
      console.log(`  Failed`);
    }
  }
  
  // Now let's see if we can find a pattern
  console.log('\n=== Analyzing keystream patterns ===\n');
  
  // Check if keystream[i] = f(firstChar, i)
  // Let's see if there's a simple relationship
  
  const chars = Object.keys(keystreamByFirstChar);
  if (chars.length >= 2) {
    const ks_A = keystreamByFirstChar['A'];
    const ks_B = keystreamByFirstChar['B'];
    
    if (ks_A && ks_B) {
      console.log('Comparing "A" (0x41) vs "B" (0x42):');
      console.log('Char diff: 1');
      
      for (let i = 0; i < 20; i++) {
        const diff = ks_A[i] ^ ks_B[i];
        console.log(`[${i.toString().padStart(2)}] A=${ks_A[i].toString(16).padStart(2, '0')} B=${ks_B[i].toString(16).padStart(2, '0')} xor=${diff.toString(16).padStart(2, '0')}`);
      }
    }
    
    // Check if keystream[i] = baseKeystream[i] XOR f(firstChar)
    // where f is some function of the first character
    
    console.log('\n=== Testing: ks[i] = base[i] XOR f(char) ===\n');
    
    // Use 'A' as base
    const baseKs = keystreamByFirstChar['A'];
    
    for (const char of chars.slice(0, 10)) {
      const ks = keystreamByFirstChar[char];
      const charCode = char.charCodeAt(0);
      
      // Calculate XOR difference from base
      const xorDiff = ks.slice(0, 20).map((k, i) => k ^ baseKs[i]);
      
      // Check if xorDiff is constant
      const uniqueDiffs = [...new Set(xorDiff)];
      
      console.log(`Char '${char}' (0x${charCode.toString(16)}): xorDiff has ${uniqueDiffs.length} unique values`);
      if (uniqueDiffs.length <= 5) {
        console.log(`  Values: ${uniqueDiffs.map(d => d.toString(16)).join(', ')}`);
      }
    }
    
    // Let's try a different approach: check if keystream is position-dependent
    console.log('\n=== Checking position dependency ===\n');
    
    // For each position, check if ks[pos] = f(char, pos)
    // where f might be: char XOR S[pos], char + S[pos], etc.
    
    for (let pos = 0; pos < 10; pos++) {
      const values = [];
      for (const char of chars) {
        const ks = keystreamByFirstChar[char];
        const charCode = char.charCodeAt(0);
        values.push({ char, charCode, ks: ks[pos] });
      }
      
      // Check if ks = charCode XOR constant
      const xorConstants = values.map(v => v.ks ^ v.charCode);
      const uniqueXor = [...new Set(xorConstants)];
      
      // Check if ks = charCode + constant (mod 256)
      const addConstants = values.map(v => (v.ks - v.charCode + 256) & 0xFF);
      const uniqueAdd = [...new Set(addConstants)];
      
      console.log(`Position ${pos}: XOR has ${uniqueXor.length} unique constants, ADD has ${uniqueAdd.length} unique constants`);
      
      if (uniqueXor.length === 1) {
        console.log(`  *** FOUND: ks[${pos}] = char XOR 0x${uniqueXor[0].toString(16)} ***`);
      }
      if (uniqueAdd.length === 1) {
        console.log(`  *** FOUND: ks[${pos}] = (char + 0x${uniqueAdd[0].toString(16)}) mod 256 ***`);
      }
    }
  }
}

main().catch(console.error);
