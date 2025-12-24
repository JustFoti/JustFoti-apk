/**
 * AnimeKai Substitution Cipher Analysis
 * 
 * DISCOVERY: This is a SUBSTITUTION cipher, not XOR!
 * Each plaintext character maps to a specific ciphertext byte.
 * 
 * Structure:
 * - Position 0: substitution of first char
 * - Positions 1-6: constant padding (f2 df 9b 9d 16 e5)
 * - Position 7: substitution of second char
 * - Positions 8-10: constant padding (67 c9 dd)
 * - Position 11: substitution of third char
 * - etc.
 */

const https = require('https');

function encryptKai(text) {
  return new Promise((resolve, reject) => {
    const url = `https://enc-dec.app/api/enc-kai?text=${encodeURIComponent(text)}`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.result);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function urlSafeBase64Decode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

const HEADER_LEN = 21;

async function main() {
  console.log('=== Building Substitution Tables ===\n');
  
  // Build substitution table for position 0
  const subTable0 = {};
  
  console.log('Building substitution table for position 0...');
  for (let i = 32; i < 127; i++) {
    const char = String.fromCharCode(i);
    try {
      const enc = await encryptKai(char);
      const dec = urlSafeBase64Decode(enc);
      const data = dec.slice(HEADER_LEN);
      subTable0[char] = data[0];
    } catch (e) {
      // Skip errors
    }
  }
  
  console.log('Position 0 substitution table:');
  const chars0 = Object.keys(subTable0).sort();
  for (let i = 0; i < chars0.length; i += 16) {
    const chunk = chars0.slice(i, i + 16);
    console.log('  ' + chunk.map(c => {
      const val = subTable0[c];
      return val !== undefined ? `'${c}':${val.toString(16).padStart(2, '0')}` : `'${c}':??`;
    }).join(' '));
  }
  
  // Build substitution table for position 7 (second char)
  console.log('\nBuilding substitution table for position 7...');
  const subTable7 = {};
  
  for (let i = 32; i < 127; i++) {
    const char = String.fromCharCode(i);
    try {
      const enc = await encryptKai('a' + char); // Use 'a' as first char
      const dec = urlSafeBase64Decode(enc);
      const data = dec.slice(HEADER_LEN);
      subTable7[char] = data[7];
    } catch (e) {
      // Skip errors
    }
  }
  
  console.log('Position 7 substitution table:');
  const chars7 = Object.keys(subTable7).sort();
  for (let i = 0; i < chars7.length; i += 16) {
    const chunk = chars7.slice(i, i + 16);
    console.log('  ' + chunk.map(c => {
      const val = subTable7[c];
      return val !== undefined ? `'${c}':${val.toString(16).padStart(2, '0')}` : `'${c}':??`;
    }).join(' '));
  }
  
  // Check if the tables are the same
  console.log('\n=== Comparing Tables ===\n');
  
  let sameCount = 0;
  let diffCount = 0;
  
  for (const char of chars0) {
    if (subTable7[char] !== undefined) {
      if (subTable0[char] === subTable7[char]) {
        sameCount++;
      } else {
        diffCount++;
        if (diffCount <= 10) {
          console.log(`  '${char}': pos0=${subTable0[char].toString(16)} vs pos7=${subTable7[char].toString(16)}`);
        }
      }
    }
  }
  
  console.log(`\nSame: ${sameCount}, Different: ${diffCount}`);
  console.log(`Tables are ${sameCount > diffCount ? 'mostly the same' : 'different'}`);
  
  // If tables are different, build a table for each position
  // But first, let's check if there's a pattern (like XOR with position)
  
  console.log('\n=== Checking for Position-based Pattern ===\n');
  
  // Check if table7 = table0 XOR constant
  const xorDiffs = [];
  for (const char of chars0) {
    if (subTable7[char] !== undefined) {
      xorDiffs.push(subTable0[char] ^ subTable7[char]);
    }
  }
  
  const allSameXor = xorDiffs.every(d => d === xorDiffs[0]);
  console.log(`Table7 = Table0 XOR constant: ${allSameXor} (constant would be ${xorDiffs[0]?.toString(16)})`);
  
  // Check if there's a simple relationship
  console.log('\nXOR differences (first 20):');
  console.log(xorDiffs.slice(0, 20).map(d => d.toString(16).padStart(2, '0')).join(' '));
  
  // Let's also check position 11 (third char)
  console.log('\nBuilding substitution table for position 11...');
  const subTable11 = {};
  
  for (let i = 32; i < 127; i++) {
    const char = String.fromCharCode(i);
    try {
      const enc = await encryptKai('aa' + char); // Use 'aa' as prefix
      const dec = urlSafeBase64Decode(enc);
      const data = dec.slice(HEADER_LEN);
      subTable11[char] = data[11];
    } catch (e) {
      // Skip errors
    }
  }
  
  // Compare with table0
  const xorDiffs11 = [];
  for (const char of chars0) {
    if (subTable11[char] !== undefined) {
      xorDiffs11.push(subTable0[char] ^ subTable11[char]);
    }
  }
  
  const allSameXor11 = xorDiffs11.every(d => d === xorDiffs11[0]);
  console.log(`Table11 = Table0 XOR constant: ${allSameXor11} (constant would be ${xorDiffs11[0]?.toString(16)})`);
  
  // If the XOR constant is different for each position, we need to find the pattern
  console.log('\n=== Position XOR Constants ===\n');
  console.log(`Position 0 -> 7: XOR = ${xorDiffs[0]?.toString(16)}`);
  console.log(`Position 0 -> 11: XOR = ${xorDiffs11[0]?.toString(16)}`);
  
  // Test encryption with our tables
  console.log('\n=== Testing Encryption ===\n');
  
  // Build reverse tables for decryption
  const reverseTable0 = {};
  for (const [char, byte] of Object.entries(subTable0)) {
    reverseTable0[byte] = char;
  }
  
  // Test decryption
  const testEnc = await encryptKai('test');
  const testDec = urlSafeBase64Decode(testEnc);
  const testData = testDec.slice(HEADER_LEN);
  
  console.log('Encrypted "test":');
  console.log(`  Cipher: ${testData.toString('hex')}`);
  console.log(`  Byte 0: ${testData[0].toString(16)} -> '${reverseTable0[testData[0]] || '?'}'`);
  
  // The structure is more complex - let's map it out
  console.log('\n=== Cipher Structure Mapping ===\n');
  
  // Encrypt strings of different lengths to understand the structure
  for (let len = 1; len <= 10; len++) {
    const str = 'a'.repeat(len);
    const enc = await encryptKai(str);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    
    console.log(`${len} chars: ${data.length} bytes -> ${data.toString('hex')}`);
  }
}

main().catch(console.error);
