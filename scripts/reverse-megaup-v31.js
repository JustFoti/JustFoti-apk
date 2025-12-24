#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v31
 * 
 * BREAKTHROUGH: At some positions, ks[i] = firstChar XOR constant[i]
 * 
 * Let's find all the constants and understand the full pattern.
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
  // Test with all printable ASCII characters
  const testChars = [];
  for (let i = 32; i < 127; i++) {
    testChars.push(String.fromCharCode(i));
  }
  
  console.log('=== Building comprehensive keystream table ===\n');
  
  const keystreamByFirstChar = {};
  
  // Test a subset first
  const sampleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  for (const char of sampleChars) {
    const ks = await getKeystreamForUA(char);
    if (ks) {
      keystreamByFirstChar[char] = ks;
    }
  }
  
  console.log(`Collected ${Object.keys(keystreamByFirstChar).length} keystrams\n`);
  
  // Analyze each position
  console.log('=== Finding XOR constants for each position ===\n');
  
  const chars = Object.keys(keystreamByFirstChar);
  const maxPos = Math.min(100, keystreamByFirstChar[chars[0]].length);
  
  const xorConstants = [];
  const positionTypes = []; // 'xor', 'complex', or 'fixed'
  
  for (let pos = 0; pos < maxPos; pos++) {
    const values = [];
    for (const char of chars) {
      const ks = keystreamByFirstChar[char];
      const charCode = char.charCodeAt(0);
      values.push({ char, charCode, ks: ks[pos] });
    }
    
    // Check if ks = charCode XOR constant
    const xorConsts = values.map(v => v.ks ^ v.charCode);
    const uniqueXor = [...new Set(xorConsts)];
    
    // Check if ks is fixed (doesn't depend on char)
    const uniqueKs = [...new Set(values.map(v => v.ks))];
    
    if (uniqueKs.length === 1) {
      positionTypes.push('fixed');
      xorConstants.push(uniqueKs[0]);
      console.log(`[${pos.toString().padStart(2)}] FIXED: ks = 0x${uniqueKs[0].toString(16).padStart(2, '0')}`);
    } else if (uniqueXor.length === 1) {
      positionTypes.push('xor');
      xorConstants.push(uniqueXor[0]);
      console.log(`[${pos.toString().padStart(2)}] XOR: ks = char XOR 0x${uniqueXor[0].toString(16).padStart(2, '0')}`);
    } else {
      positionTypes.push('complex');
      xorConstants.push(null);
      // Analyze the pattern more
      if (uniqueXor.length <= 5) {
        console.log(`[${pos.toString().padStart(2)}] COMPLEX: ${uniqueXor.length} XOR values: ${uniqueXor.map(x => x.toString(16)).join(', ')}`);
      } else {
        console.log(`[${pos.toString().padStart(2)}] COMPLEX: ${uniqueXor.length} different XOR values`);
      }
    }
  }
  
  // Count types
  const fixedCount = positionTypes.filter(t => t === 'fixed').length;
  const xorCount = positionTypes.filter(t => t === 'xor').length;
  const complexCount = positionTypes.filter(t => t === 'complex').length;
  
  console.log(`\n=== Summary ===`);
  console.log(`Fixed positions: ${fixedCount}`);
  console.log(`XOR positions: ${xorCount}`);
  console.log(`Complex positions: ${complexCount}`);
  
  // For complex positions, let's analyze the pattern more
  console.log('\n=== Analyzing complex positions ===\n');
  
  for (let pos = 0; pos < maxPos; pos++) {
    if (positionTypes[pos] !== 'complex') continue;
    
    const values = [];
    for (const char of chars) {
      const ks = keystreamByFirstChar[char];
      const charCode = char.charCodeAt(0);
      values.push({ char, charCode, ks: ks[pos] });
    }
    
    // Group by XOR constant
    const byXorConst = {};
    for (const v of values) {
      const xorConst = v.ks ^ v.charCode;
      if (!byXorConst[xorConst]) byXorConst[xorConst] = [];
      byXorConst[xorConst].push(v);
    }
    
    console.log(`Position ${pos}:`);
    for (const [xorConst, items] of Object.entries(byXorConst)) {
      const charCodes = items.map(i => i.charCode);
      // Check if there's a pattern in the char codes
      const charCodeMod = charCodes.map(c => c & 0x0F);
      const uniqueMod = [...new Set(charCodeMod)];
      
      console.log(`  XOR 0x${parseInt(xorConst).toString(16).padStart(2, '0')}: chars ${items.map(i => i.char).join('')} (codes: ${charCodes.map(c => c.toString(16)).join(',')})`);
    }
    
    if (pos >= 10) break; // Limit output
  }
}

main().catch(console.error);
