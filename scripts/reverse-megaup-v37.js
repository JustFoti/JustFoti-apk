#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v37
 * 
 * Key insight: The encrypted data is tied to the UA used to fetch it.
 * We need to fetch fresh encrypted data for each UA we want to test.
 */

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function getEncryptedAndDecrypted(videoId, ua) {
  const baseUrl = 'https://megaup22.online';
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  
  if (!mediaResponse.ok) return null;
  
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  if (!encrypted) return null;
  
  const decResult = await testDecryption(encrypted, ua);
  if (decResult.status !== 200) return null;
  
  const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
  
  return { encrypted, decrypted };
}

async function main() {
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  
  console.log('=== Collecting data for multiple UAs ===\n');
  
  // Test with single-char UAs to understand the pattern
  const testChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  const dataByChar = {};
  
  for (const char of testChars) {
    process.stdout.write(`Testing "${char}"... `);
    const result = await getEncryptedAndDecrypted(videoId, char);
    
    if (result) {
      const encBytes = Buffer.from(result.encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      const decBytes = Buffer.from(result.decrypted, 'utf8');
      
      // Calculate keystream
      const keystream = [];
      for (let i = 0; i < decBytes.length; i++) {
        keystream.push(encBytes[i] ^ decBytes[i]);
      }
      
      dataByChar[char.charCodeAt(0)] = {
        encrypted: result.encrypted,
        decrypted: result.decrypted,
        encBytes,
        decBytes,
        keystream
      };
      
      console.log(`OK (enc=${encBytes.length}, dec=${decBytes.length})`);
    } else {
      console.log('FAILED');
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  const charCodes = Object.keys(dataByChar).map(Number);
  console.log(`\nCollected ${charCodes.length} samples\n`);
  
  if (charCodes.length < 2) {
    console.log('Not enough data');
    return;
  }
  
  // Check if all decrypted outputs are the same
  const decryptedValues = charCodes.map(c => dataByChar[c].decrypted);
  const allSameDecrypted = decryptedValues.every(d => d === decryptedValues[0]);
  console.log('All decrypted outputs identical:', allSameDecrypted);
  
  // Check if all encrypted outputs are the same
  const encryptedValues = charCodes.map(c => dataByChar[c].encrypted);
  const allSameEncrypted = encryptedValues.every(e => e === encryptedValues[0]);
  console.log('All encrypted outputs identical:', allSameEncrypted);
  
  if (!allSameEncrypted) {
    // Compare encrypted bytes
    const enc0 = dataByChar[charCodes[0]].encBytes;
    const enc1 = dataByChar[charCodes[1]].encBytes;
    
    let diffs = 0;
    const diffPositions = [];
    for (let i = 0; i < Math.min(enc0.length, enc1.length); i++) {
      if (enc0[i] !== enc1[i]) {
        diffs++;
        if (diffPositions.length < 50) {
          diffPositions.push(i);
        }
      }
    }
    console.log(`Encrypted diff count: ${diffs}/${enc0.length}`);
    console.log(`Diff positions: ${diffPositions.join(', ')}`);
  }
  
  // Analyze keystream patterns
  console.log('\n=== Analyzing keystream patterns ===\n');
  
  const maxPos = dataByChar[charCodes[0]].keystream.length;
  const positionRules = [];
  
  for (let pos = 0; pos < maxPos; pos++) {
    const values = charCodes.map(code => ({ code, ks: dataByChar[code].keystream[pos] }));
    
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
  
  console.log('Rule counts:', counts);
  
  // Show first 30 rules
  console.log('\nFirst 30 position rules:');
  for (let i = 0; i < Math.min(30, positionRules.length); i++) {
    const rule = positionRules[i];
    if (rule.type === 'fixed') {
      console.log(`[${i.toString().padStart(2)}] FIXED: 0x${rule.value.toString(16).padStart(2, '0')}`);
    } else if (rule.type === 'xor') {
      console.log(`[${i.toString().padStart(2)}] XOR: char ^ 0x${rule.constant.toString(16).padStart(2, '0')}`);
    } else if (rule.type === 'highNibble') {
      const mapStr = Object.entries(rule.map).map(([k, v]) => `0x${parseInt(k).toString(16)}:0x${v.toString(16)}`).join(', ');
      console.log(`[${i.toString().padStart(2)}] HIGH_NIBBLE: {${mapStr}}`);
    } else {
      console.log(`[${i.toString().padStart(2)}] LOOKUP: ${Object.keys(rule.table).length} entries`);
    }
  }
  
  // Test with a real UA
  console.log('\n=== Testing with real UA ===\n');
  
  const realUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const realResult = await getEncryptedAndDecrypted(videoId, realUA);
  
  if (realResult) {
    const realEncBytes = Buffer.from(realResult.encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const realDecBytes = Buffer.from(realResult.decrypted, 'utf8');
    
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
    for (let i = 0; i < generatedKs.length && i < realEncBytes.length; i++) {
      ourDecrypted.push(realEncBytes[i] ^ generatedKs[i]);
    }
    
    const ourDecryptedStr = Buffer.from(ourDecrypted).toString('utf8');
    
    // Compare
    let matches = 0;
    for (let i = 0; i < Math.min(realResult.decrypted.length, ourDecryptedStr.length); i++) {
      if (realResult.decrypted[i] === ourDecryptedStr[i]) matches++;
    }
    
    console.log(`Match rate: ${matches}/${realResult.decrypted.length} (${(matches/realResult.decrypted.length*100).toFixed(1)}%)`);
    console.log('Expected:', realResult.decrypted.substring(0, 100));
    console.log('Got:', ourDecryptedStr.substring(0, 100));
  }
  
  // Save the rules
  const fs = require('fs');
  fs.writeFileSync('megaup-keystream-rules-v3.json', JSON.stringify({
    positionRules,
    counts
  }, null, 2));
  console.log('\nSaved rules to megaup-keystream-rules-v3.json');
}

main().catch(console.error);
