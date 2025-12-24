/**
 * AnimeKai API Testing
 * Test the enc-dec.app API to understand the encryption pattern
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

// URL-safe Base64 decode
function urlSafeBase64Decode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

async function main() {
  console.log('=== AnimeKai Encryption Pattern Analysis ===\n');
  
  // Test single characters
  const tests = ['a', 'b', 'c', 'aa', 'ab', 'abc', 'aaa', 'aaaa'];
  
  console.log('Single character tests:');
  for (const test of tests) {
    const encrypted = await encryptKai(test);
    const decoded = urlSafeBase64Decode(encrypted);
    console.log(`"${test}" (${test.length}) -> ${encrypted} (${encrypted.length} chars, ${decoded.length} bytes)`);
  }
  
  console.log('\n=== Byte-level Analysis ===\n');
  
  // Compare 'a' vs 'b' vs 'c'
  const encA = await encryptKai('a');
  const encB = await encryptKai('b');
  const encC = await encryptKai('c');
  
  const decA = urlSafeBase64Decode(encA);
  const decB = urlSafeBase64Decode(encB);
  const decC = urlSafeBase64Decode(encC);
  
  console.log('Comparing single chars:');
  console.log(`a: ${decA.toString('hex')}`);
  console.log(`b: ${decB.toString('hex')}`);
  console.log(`c: ${decC.toString('hex')}`);
  
  // Find differences
  console.log('\nByte differences:');
  for (let i = 0; i < Math.min(decA.length, decB.length, decC.length); i++) {
    if (decA[i] !== decB[i] || decB[i] !== decC[i]) {
      console.log(`  Byte ${i}: a=${decA[i].toString(16)} b=${decB[i].toString(16)} c=${decC[i].toString(16)}`);
      
      // Check if the difference matches the plaintext difference
      const diffAB = decA[i] ^ decB[i];
      const diffBC = decB[i] ^ decC[i];
      const plainDiffAB = 'a'.charCodeAt(0) ^ 'b'.charCodeAt(0);
      const plainDiffBC = 'b'.charCodeAt(0) ^ 'c'.charCodeAt(0);
      
      console.log(`    XOR diff a^b: ${diffAB.toString(16)} (plain diff: ${plainDiffAB.toString(16)})`);
      console.log(`    XOR diff b^c: ${diffBC.toString(16)} (plain diff: ${plainDiffBC.toString(16)})`);
    }
  }
  
  console.log('\n=== XOR Key Derivation ===\n');
  
  // If we know plaintext 'a' and ciphertext, we can derive the key
  const plainA = Buffer.from('a', 'utf8');
  
  // The cipher has a header - find where the actual encrypted data starts
  // by looking at where the difference occurs
  let dataStart = 0;
  for (let i = 0; i < decA.length; i++) {
    if (decA[i] !== decB[i]) {
      dataStart = i;
      break;
    }
  }
  console.log(`Data starts at byte: ${dataStart}`);
  console.log(`Header: ${decA.slice(0, dataStart).toString('hex')}`);
  
  // Derive key from 'a'
  const keyFromA = decA[dataStart] ^ plainA[0];
  const keyFromB = decB[dataStart] ^ 'b'.charCodeAt(0);
  const keyFromC = decC[dataStart] ^ 'c'.charCodeAt(0);
  
  console.log(`Key byte from 'a': ${keyFromA.toString(16)}`);
  console.log(`Key byte from 'b': ${keyFromB.toString(16)}`);
  console.log(`Key byte from 'c': ${keyFromC.toString(16)}`);
  
  if (keyFromA === keyFromB && keyFromB === keyFromC) {
    console.log('✓ Key is consistent! This is a simple XOR cipher.');
  } else {
    console.log('✗ Key varies - this is NOT a simple XOR cipher.');
  }
  
  console.log('\n=== Testing Longer Strings ===\n');
  
  // Test 'aaaa' to see if key repeats
  const encAAAA = await encryptKai('aaaa');
  const decAAAA = urlSafeBase64Decode(encAAAA);
  
  console.log(`aaaa: ${decAAAA.slice(dataStart).toString('hex')}`);
  
  // Derive key bytes
  const keyBytes = [];
  for (let i = 0; i < 4; i++) {
    keyBytes.push(decAAAA[dataStart + i] ^ 'a'.charCodeAt(0));
  }
  console.log(`Key bytes from 'aaaa': ${keyBytes.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // Test if key repeats
  const encAAAAAAAA = await encryptKai('aaaaaaaa');
  const decAAAAAAAA = urlSafeBase64Decode(encAAAAAAAA);
  
  const keyBytes8 = [];
  for (let i = 0; i < 8; i++) {
    keyBytes8.push(decAAAAAAAA[dataStart + i] ^ 'a'.charCodeAt(0));
  }
  console.log(`Key bytes from 'aaaaaaaa': ${keyBytes8.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // Check for repeating pattern
  const isRepeating = keyBytes8[0] === keyBytes8[4] && keyBytes8[1] === keyBytes8[5];
  console.log(`Key repeats every 4 bytes: ${isRepeating}`);
}

main().catch(console.error);
