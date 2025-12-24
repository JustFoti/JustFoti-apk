#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v33
 * 
 * Build a COMPLETE keystream table for all 256 possible first characters.
 * Then implement native decryption.
 */

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
  
  try {
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
    
    return { keystream, encBytes, decBytes, decrypted };
  } catch (e) {
    return null;
  }
}

async function main() {
  // Test with characters from different ranges to understand the pattern
  const testChars = [];
  
  // All printable ASCII
  for (let i = 32; i < 127; i++) {
    testChars.push(String.fromCharCode(i));
  }
  
  console.log('=== Collecting keystream data ===\n');
  
  const keystreamByChar = {};
  let sampleEncrypted = null;
  let sampleDecrypted = null;
  
  for (const char of testChars) {
    process.stdout.write(`Testing "${char}" (0x${char.charCodeAt(0).toString(16)})... `);
    const result = await getKeystreamForUA(char);
    
    if (result) {
      keystreamByChar[char.charCodeAt(0)] = result.keystream;
      if (!sampleEncrypted) {
        sampleEncrypted = result.encBytes;
        sampleDecrypted = result.decrypted;
      }
      console.log(`OK (${result.keystream.length} bytes)`);
    } else {
      console.log('FAILED');
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  const charCodes = Object.keys(keystreamByChar).map(Number);
  console.log(`\nCollected ${charCodes.length} keystrams\n`);
  
  if (charCodes.length < 10) {
    console.log('Not enough data');
    return;
  }
  
  // Analyze ALL positions
  const maxPos = keystreamByChar[charCodes[0]].length;
  console.log(`Analyzing ${maxPos} positions...\n`);
  
  const positionRules = [];
  
  for (let pos = 0; pos < maxPos; pos++) {
    const values = [];
    for (const code of charCodes) {
      values.push({ code, ks: keystreamByChar[code][pos] });
    }
    
    // Check if FIXED
    const uniqueKs = [...new Set(values.map(v => v.ks))];
    if (uniqueKs.length === 1) {
      positionRules.push({ type: 'fixed', value: uniqueKs[0] });
      continue;
    }
    
    // Check if simple XOR: ks = code ^ constant
    const xorConsts = values.map(v => v.ks ^ v.code);
    const uniqueXor = [...new Set(xorConsts)];
    if (uniqueXor.length === 1) {
      positionRules.push({ type: 'xor', constant: uniqueXor[0] });
      continue;
    }
    
    // Check if depends on high nibble (code & 0xF0)
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
    
    // Check if depends on low nibble (code & 0x0F)
    const byLowNibble = {};
    for (const v of values) {
      const lowNibble = v.code & 0x0F;
      const xorConst = v.ks ^ v.code;
      if (!byLowNibble[lowNibble]) byLowNibble[lowNibble] = new Set();
      byLowNibble[lowNibble].add(xorConst);
    }
    
    let isLowNibble = true;
    for (const consts of Object.values(byLowNibble)) {
      if (consts.size > 1) { isLowNibble = false; break; }
    }
    
    if (isLowNibble) {
      const nibbleMap = {};
      for (const [nibble, consts] of Object.entries(byLowNibble)) {
        nibbleMap[parseInt(nibble)] = [...consts][0];
      }
      positionRules.push({ type: 'lowNibble', map: nibbleMap });
      continue;
    }
    
    // Build a full lookup table for this position
    const lookup = {};
    for (const v of values) {
      lookup[v.code] = v.ks;
    }
    positionRules.push({ type: 'lookup', table: lookup });
  }
  
  // Count rule types
  const counts = { fixed: 0, xor: 0, highNibble: 0, lowNibble: 0, lookup: 0 };
  for (const rule of positionRules) {
    counts[rule.type]++;
  }
  
  console.log('=== Rule Summary ===');
  console.log(`Fixed: ${counts.fixed}`);
  console.log(`XOR: ${counts.xor}`);
  console.log(`High Nibble: ${counts.highNibble}`);
  console.log(`Low Nibble: ${counts.lowNibble}`);
  console.log(`Lookup: ${counts.lookup}`);
  
  // Generate the decryption function
  console.log('\n=== Generating decryption code ===\n');
  
  // Build compact representation
  const fixedPositions = [];
  const xorPositions = [];
  const highNibblePositions = [];
  const lowNibblePositions = [];
  const lookupPositions = [];
  
  for (let i = 0; i < positionRules.length; i++) {
    const rule = positionRules[i];
    switch (rule.type) {
      case 'fixed':
        fixedPositions.push([i, rule.value]);
        break;
      case 'xor':
        xorPositions.push([i, rule.constant]);
        break;
      case 'highNibble':
        highNibblePositions.push([i, rule.map]);
        break;
      case 'lowNibble':
        lowNibblePositions.push([i, rule.map]);
        break;
      case 'lookup':
        lookupPositions.push([i, rule.table]);
        break;
    }
  }
  
  // Output the rules as JSON for analysis
  const rulesData = {
    totalPositions: positionRules.length,
    counts,
    fixedPositions,
    xorPositions,
    highNibblePositions,
    lowNibblePositions,
    lookupCount: lookupPositions.length
  };
  
  console.log(JSON.stringify(rulesData, null, 2));
  
  // Test our understanding by reconstructing keystream for a known UA
  console.log('\n=== Testing reconstruction ===\n');
  
  const testCode = 'M'.charCodeAt(0); // 0x4D
  const actualKs = keystreamByChar[testCode];
  
  if (actualKs) {
    let matches = 0;
    let mismatches = 0;
    
    for (let i = 0; i < positionRules.length; i++) {
      const rule = positionRules[i];
      let predicted;
      
      switch (rule.type) {
        case 'fixed':
          predicted = rule.value;
          break;
        case 'xor':
          predicted = testCode ^ rule.constant;
          break;
        case 'highNibble':
          predicted = testCode ^ (rule.map[testCode & 0xF0] || 0);
          break;
        case 'lowNibble':
          predicted = testCode ^ (rule.map[testCode & 0x0F] || 0);
          break;
        case 'lookup':
          predicted = rule.table[testCode];
          break;
      }
      
      if (predicted === actualKs[i]) {
        matches++;
      } else {
        mismatches++;
        if (mismatches <= 10) {
          console.log(`Mismatch at ${i}: predicted ${predicted?.toString(16)}, actual ${actualKs[i].toString(16)}`);
        }
      }
    }
    
    console.log(`\nMatches: ${matches}/${positionRules.length} (${(matches/positionRules.length*100).toFixed(1)}%)`);
  }
  
  // Save the rules to a file
  const fs = require('fs');
  fs.writeFileSync('megaup-keystream-rules.json', JSON.stringify({
    positionRules,
    sampleDecrypted
  }, null, 2));
  console.log('\nSaved rules to megaup-keystream-rules.json');
}

main().catch(console.error);
