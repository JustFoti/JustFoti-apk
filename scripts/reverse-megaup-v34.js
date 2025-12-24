#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v34
 * 
 * Generate a compact native decryption implementation from the rules.
 */

const fs = require('fs');

// Read the rules
const rulesData = JSON.parse(fs.readFileSync('megaup-keystream-rules.json', 'utf8'));
const { positionRules } = rulesData;

console.log(`Total positions: ${positionRules.length}`);

// Count rule types
const counts = { fixed: 0, xor: 0, highNibble: 0, lookup: 0 };
for (const rule of positionRules) {
  counts[rule.type]++;
}
console.log('Rule counts:', counts);

// Generate compact representation
// For lookup tables, we need to handle the fact that we only have data for chars 48-57 (0-9) and 65-90 (A-Z) and 80-90 (P-Z)
// Real UAs start with letters, so we need to handle 65-90 (A-Z) and 97-122 (a-z)

// Let's analyze the lookup tables to find patterns
console.log('\n=== Analyzing lookup tables ===\n');

for (let i = 0; i < Math.min(20, positionRules.length); i++) {
  const rule = positionRules[i];
  if (rule.type === 'lookup') {
    const table = rule.table;
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
    
    // Check if there's a pattern based on char ranges
    // 48-57 = digits (0-9)
    // 65-90 = uppercase (A-Z)
    // 80-90 = P-Z (subset of uppercase)
    
    // Check if digits have same value
    const digitValues = keys.filter(k => k >= 48 && k <= 57).map(k => table[k]);
    const upperValues = keys.filter(k => k >= 65 && k <= 90).map(k => table[k]);
    
    const uniqueDigits = [...new Set(digitValues)];
    const uniqueUpper = [...new Set(upperValues)];
    
    console.log(`Position ${i}: digits=${uniqueDigits.length} unique, upper=${uniqueUpper.length} unique`);
    
    // Check if it's based on high nibble
    const byHighNibble = {};
    for (const k of keys) {
      const highNibble = k & 0xF0;
      if (!byHighNibble[highNibble]) byHighNibble[highNibble] = [];
      byHighNibble[highNibble].push({ k, v: table[k], xor: table[k] ^ k });
    }
    
    for (const [nibble, items] of Object.entries(byHighNibble)) {
      const xorValues = [...new Set(items.map(i => i.xor))];
      if (xorValues.length <= 2) {
        console.log(`  Nibble 0x${parseInt(nibble).toString(16)}: ${xorValues.length} XOR values`);
      }
    }
  }
}

// Now let's test with a real encrypted sample
console.log('\n=== Testing with real data ===\n');

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function main() {
  // Get a fresh encrypted sample with a real UA
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  const realUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 'User-Agent': realUA, 'Referer': `${baseUrl}/e/${videoId}` },
  });
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  console.log('Encrypted length:', encrypted.length);
  
  // Get the expected decryption
  const decResult = await testDecryption(encrypted, realUA);
  console.log('Decryption status:', decResult.status);
  
  if (decResult.status === 200) {
    const expected = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
    console.log('Expected decrypted length:', expected.length);
    console.log('Expected first 100 chars:', expected.substring(0, 100));
    
    // Now try to decrypt using our rules
    const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const firstChar = realUA.charCodeAt(0); // 'M' = 77
    
    console.log('\nFirst char of UA:', realUA[0], '=', firstChar);
    
    // Generate keystream
    const keystream = [];
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
            // Fallback: try to find a pattern
            // Check if all values in the same high nibble range are the same
            const highNibble = firstChar & 0xF0;
            const sameNibbleKeys = Object.keys(rule.table).map(Number).filter(k => (k & 0xF0) === highNibble);
            if (sameNibbleKeys.length > 0) {
              // Use the first one as a guess
              ks = rule.table[sameNibbleKeys[0]];
            } else {
              ks = 0;
            }
          }
          break;
      }
      
      keystream.push(ks);
    }
    
    // Decrypt
    const decrypted = [];
    for (let i = 0; i < keystream.length && i < encBytes.length; i++) {
      decrypted.push(encBytes[i] ^ keystream[i]);
    }
    
    const decryptedStr = Buffer.from(decrypted).toString('utf8');
    console.log('\nOur decrypted first 100 chars:', decryptedStr.substring(0, 100));
    
    // Compare
    let matches = 0;
    for (let i = 0; i < Math.min(expected.length, decryptedStr.length); i++) {
      if (expected[i] === decryptedStr[i]) matches++;
    }
    console.log(`\nMatch rate: ${matches}/${expected.length} (${(matches/expected.length*100).toFixed(1)}%)`);
    
    // Find first mismatch
    for (let i = 0; i < Math.min(expected.length, decryptedStr.length); i++) {
      if (expected[i] !== decryptedStr[i]) {
        console.log(`First mismatch at position ${i}: expected '${expected[i]}' (${expected.charCodeAt(i)}), got '${decryptedStr[i]}' (${decryptedStr.charCodeAt(i)})`);
        break;
      }
    }
  }
}

main().catch(console.error);
