#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v36
 * 
 * Key insight: The encrypted data is nearly identical regardless of UA.
 * The keystream XOR pattern between UAs is sparse and predictable.
 * 
 * Let's build a complete keystream table for ALL positions.
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
  
  // Get a fresh encrypted sample
  const ua = 'M';
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  
  // Get decrypted
  const decResult = await testDecryption(encrypted, ua);
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  const decBytes = Buffer.from(decrypted, 'utf8');
  
  // Calculate keystream for 'M'
  const keystreamM = [];
  for (let i = 0; i < decBytes.length; i++) {
    keystreamM.push(encBytes[i] ^ decBytes[i]);
  }
  
  console.log('Keystream for "M" (first 50):', Buffer.from(keystreamM.slice(0, 50)).toString('hex'));
  
  // Now test with different UAs and see how the keystream changes
  const testUAs = ['A', 'B', 'Z', 'a', 'z', '0', '9', 'Mozilla/5.0'];
  
  console.log('\n=== Comparing keystrams ===\n');
  
  for (const testUA of testUAs) {
    // Get decrypted with this UA (using the SAME encrypted data)
    const decResult2 = await testDecryption(encrypted, testUA);
    
    if (decResult2.status !== 200) {
      console.log(`UA "${testUA}": FAILED`);
      continue;
    }
    
    const decrypted2 = typeof decResult2.result === 'string' ? decResult2.result : JSON.stringify(decResult2.result);
    const decBytes2 = Buffer.from(decrypted2, 'utf8');
    
    // Calculate keystream
    const keystream2 = [];
    for (let i = 0; i < decBytes2.length; i++) {
      keystream2.push(encBytes[i] ^ decBytes2[i]);
    }
    
    // Compare with keystreamM
    let diffs = 0;
    const diffPositions = [];
    for (let i = 0; i < Math.min(keystreamM.length, keystream2.length); i++) {
      if (keystreamM[i] !== keystream2[i]) {
        diffs++;
        if (diffPositions.length < 20) {
          diffPositions.push(i);
        }
      }
    }
    
    const firstChar = testUA.charCodeAt(0);
    const mChar = 'M'.charCodeAt(0);
    console.log(`UA "${testUA}" (0x${firstChar.toString(16)}): ${diffs} differences`);
    console.log(`  First diff positions: ${diffPositions.slice(0, 10).join(', ')}`);
    
    // Check if differences are at predictable positions
    // Based on our earlier analysis, positions 1, 3, 17, 22, 25 are XOR positions
    const xorPositions = [1, 3, 17, 22, 25];
    const xorDiffs = xorPositions.filter(p => keystreamM[p] !== keystream2[p]);
    console.log(`  XOR position diffs: ${xorDiffs.join(', ')}`);
    
    // For XOR positions, check if the difference matches char difference
    for (const pos of xorPositions) {
      if (keystreamM[pos] !== keystream2[pos]) {
        const ksDiff = keystreamM[pos] ^ keystream2[pos];
        const charDiff = mChar ^ firstChar;
        console.log(`    Pos ${pos}: ks diff = 0x${ksDiff.toString(16)}, char diff = 0x${charDiff.toString(16)}, match: ${ksDiff === charDiff}`);
      }
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Now let's understand the full pattern
  console.log('\n=== Building full keystream model ===\n');
  
  // The keystream depends on the first char of UA
  // For each position, we need to know:
  // 1. Is it fixed (same for all UAs)?
  // 2. Is it XOR with a constant?
  // 3. Is it a lookup based on char?
  
  // Collect keystrams for multiple UAs
  const keystreamByChar = {};
  const testChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  for (const char of testChars) {
    const decResult = await testDecryption(encrypted, char);
    if (decResult.status === 200) {
      const dec = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
      const decB = Buffer.from(dec, 'utf8');
      const ks = [];
      for (let i = 0; i < decB.length; i++) {
        ks.push(encBytes[i] ^ decB[i]);
      }
      keystreamByChar[char.charCodeAt(0)] = ks;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`Collected ${Object.keys(keystreamByChar).length} keystrams`);
  
  // Analyze each position
  const charCodes = Object.keys(keystreamByChar).map(Number);
  const maxPos = keystreamByChar[charCodes[0]].length;
  
  const positionRules = [];
  
  for (let pos = 0; pos < maxPos; pos++) {
    const values = charCodes.map(code => ({ code, ks: keystreamByChar[code][pos] }));
    
    // Check if FIXED
    const uniqueKs = [...new Set(values.map(v => v.ks))];
    if (uniqueKs.length === 1) {
      positionRules.push({ type: 'fixed', value: uniqueKs[0] });
      continue;
    }
    
    // Check if XOR: ks = code ^ constant
    const xorConsts = values.map(v => v.ks ^ v.code);
    const uniqueXor = [...new Set(xorConsts)];
    if (uniqueXor.length === 1) {
      positionRules.push({ type: 'xor', constant: uniqueXor[0] });
      continue;
    }
    
    // Check high nibble dependency
    const byHighNibble = {};
    for (const v of values) {
      const highNibble = v.code & 0xF0;
      const xorConst = v.ks ^ v.code;
      if (!byHighNibble[highNibble]) byHighNibble[highNibble] = new Set();
      byHighNibble[highNibble].add(xorConst);
    }
    
    let isHighNibble = true;
    for (const consts of Object.values(byHighNibble)) {
      if (consts.size > 1) { isHighNibble = false; break; }
    }
    
    if (isHighNibble) {
      const nibbleMap = {};
      for (const [nibble, consts] of Object.entries(byHighNibble)) {
        nibbleMap[parseInt(nibble)] = [...consts][0];
      }
      positionRules.push({ type: 'highNibble', map: nibbleMap });
      continue;
    }
    
    // Build lookup table
    const lookup = {};
    for (const v of values) {
      lookup[v.code] = v.ks;
    }
    positionRules.push({ type: 'lookup', table: lookup });
  }
  
  // Count types
  const counts = { fixed: 0, xor: 0, highNibble: 0, lookup: 0 };
  for (const rule of positionRules) {
    counts[rule.type]++;
  }
  
  console.log('\nRule counts:', counts);
  
  // Test reconstruction with a real UA
  console.log('\n=== Testing with real UA ===\n');
  
  const realUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const realDecResult = await testDecryption(encrypted, realUA);
  
  if (realDecResult.status === 200) {
    const realDecrypted = typeof realDecResult.result === 'string' ? realDecResult.result : JSON.stringify(realDecResult.result);
    const realDecBytes = Buffer.from(realDecrypted, 'utf8');
    
    // Generate keystream using our rules
    const firstChar = realUA.charCodeAt(0); // 'M' = 77
    const generatedKs = [];
    
    for (let i = 0; i < positionRules.length; i++) {
      const rule = positionRules[i];
      let ks;
      
      switch (rule.type) {
        case 'fixed':
          ks = rule.value;
          break;
        case 'xor':
          ks = firstChar ^ rule.constant;
          break;
        case 'highNibble':
          ks = firstChar ^ (rule.map[firstChar & 0xF0] || 0);
          break;
        case 'lookup':
          ks = rule.table[firstChar];
          if (ks === undefined) {
            // Use high nibble fallback
            const highNibble = firstChar & 0xF0;
            const sameNibbleKeys = Object.keys(rule.table).map(Number).filter(k => (k & 0xF0) === highNibble);
            if (sameNibbleKeys.length > 0) {
              ks = rule.table[sameNibbleKeys[0]];
            } else {
              ks = 0;
            }
          }
          break;
      }
      
      generatedKs.push(ks);
    }
    
    // Decrypt
    const ourDecrypted = [];
    for (let i = 0; i < generatedKs.length && i < encBytes.length; i++) {
      ourDecrypted.push(encBytes[i] ^ generatedKs[i]);
    }
    
    const ourDecryptedStr = Buffer.from(ourDecrypted).toString('utf8');
    
    // Compare
    let matches = 0;
    for (let i = 0; i < Math.min(realDecrypted.length, ourDecryptedStr.length); i++) {
      if (realDecrypted[i] === ourDecryptedStr[i]) matches++;
    }
    
    console.log(`Match rate: ${matches}/${realDecrypted.length} (${(matches/realDecrypted.length*100).toFixed(1)}%)`);
    console.log('Expected:', realDecrypted.substring(0, 100));
    console.log('Got:', ourDecryptedStr.substring(0, 100));
    
    // Find mismatches
    const mismatches = [];
    for (let i = 0; i < Math.min(realDecrypted.length, ourDecryptedStr.length); i++) {
      if (realDecrypted[i] !== ourDecryptedStr[i]) {
        mismatches.push(i);
      }
    }
    console.log(`\nMismatch positions (first 20): ${mismatches.slice(0, 20).join(', ')}`);
    
    // For each mismatch, show the rule type
    for (const pos of mismatches.slice(0, 10)) {
      const rule = positionRules[pos];
      console.log(`  Pos ${pos}: rule type = ${rule.type}`);
    }
  }
  
  // Save the rules
  const fs = require('fs');
  fs.writeFileSync('megaup-keystream-rules-v2.json', JSON.stringify({
    positionRules,
    counts,
    encryptedSample: encrypted
  }, null, 2));
  console.log('\nSaved rules to megaup-keystream-rules-v2.json');
}

main().catch(console.error);
