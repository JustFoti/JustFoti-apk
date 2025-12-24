#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v32
 * 
 * Use the data we already collected to analyze the pattern.
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
    
    if (!mediaResponse.ok) {
      console.log(`  HTTP ${mediaResponse.status}`);
      return null;
    }
    
    const mediaData = await mediaResponse.json();
    const encrypted = mediaData.result;
    
    if (!encrypted) {
      console.log(`  No encrypted data`);
      return null;
    }
    
    const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    const decResult = await testDecryption(encrypted, ua);
    
    if (decResult.status !== 200) {
      console.log(`  Decrypt failed: ${decResult.error}`);
      return null;
    }
    
    const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
    const decBytes = Buffer.from(decrypted, 'utf8');
    
    const keystream = [];
    for (let i = 0; i < decBytes.length; i++) {
      keystream.push(encBytes[i] ^ decBytes[i]);
    }
    
    return keystream;
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return null;
  }
}

async function main() {
  // Use a smaller set of characters with delays
  const testChars = 'ABCDEFGHIJKLMNOP0123456789';
  
  console.log('=== Building keystream table ===\n');
  
  const keystreamByFirstChar = {};
  
  for (const char of testChars) {
    console.log(`Testing UA: "${char}"`);
    const ks = await getKeystreamForUA(char);
    if (ks) {
      keystreamByFirstChar[char] = ks;
      console.log(`  OK: ks[0:4] = ${Buffer.from(ks.slice(0, 4)).toString('hex')}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\nCollected ${Object.keys(keystreamByFirstChar).length} keystrams\n`);
  
  if (Object.keys(keystreamByFirstChar).length < 5) {
    console.log('Not enough data, exiting');
    return;
  }
  
  // Analyze each position
  console.log('=== Finding patterns for each position ===\n');
  
  const chars = Object.keys(keystreamByFirstChar);
  const maxPos = Math.min(50, keystreamByFirstChar[chars[0]].length);
  
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
    
    // Check if ks is fixed
    const uniqueKs = [...new Set(values.map(v => v.ks))];
    
    if (uniqueKs.length === 1) {
      console.log(`[${pos.toString().padStart(2)}] FIXED: 0x${uniqueKs[0].toString(16).padStart(2, '0')}`);
    } else if (uniqueXor.length === 1) {
      console.log(`[${pos.toString().padStart(2)}] XOR: char ^ 0x${uniqueXor[0].toString(16).padStart(2, '0')}`);
    } else if (uniqueXor.length <= 4) {
      // Check if it depends on char & 0xF0 (high nibble)
      const byHighNibble = {};
      for (const v of values) {
        const highNibble = v.charCode & 0xF0;
        const xorConst = v.ks ^ v.charCode;
        if (!byHighNibble[highNibble]) byHighNibble[highNibble] = new Set();
        byHighNibble[highNibble].add(xorConst);
      }
      
      let isHighNibbleDependent = true;
      for (const [nibble, consts] of Object.entries(byHighNibble)) {
        if (consts.size > 1) isHighNibbleDependent = false;
      }
      
      if (isHighNibbleDependent) {
        const nibbleMap = {};
        for (const [nibble, consts] of Object.entries(byHighNibble)) {
          nibbleMap[parseInt(nibble).toString(16)] = [...consts][0].toString(16);
        }
        console.log(`[${pos.toString().padStart(2)}] HIGH_NIBBLE: ${JSON.stringify(nibbleMap)}`);
      } else {
        console.log(`[${pos.toString().padStart(2)}] COMPLEX: ${uniqueXor.length} XOR values`);
      }
    } else {
      console.log(`[${pos.toString().padStart(2)}] COMPLEX: ${uniqueXor.length} XOR values`);
    }
  }
}

main().catch(console.error);
