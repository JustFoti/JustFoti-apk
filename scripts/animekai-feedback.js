/**
 * AnimeKai Feedback Cipher Analysis
 * 
 * The key at each position depends on the previous plaintext/ciphertext.
 * This is characteristic of:
 * - CFB (Cipher Feedback) mode
 * - OFB (Output Feedback) mode
 * - A custom feedback cipher
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
  console.log('=== Feedback Cipher Analysis ===\n');
  
  // Test: Does the key depend on the previous plaintext or ciphertext?
  
  // If CFB: key[i] = f(cipher[i-1])
  // If OFB: key[i] = f(key[i-1])
  // If custom: key[i] = f(plain[i-1], cipher[i-1], key[i-1])
  
  // Test with 'aa' vs 'ab' - same first char, different second
  const encAA = await encryptKai('aa');
  const encAB = await encryptKai('ab');
  
  const decAA = urlSafeBase64Decode(encAA).slice(HEADER_LEN);
  const decAB = urlSafeBase64Decode(encAB).slice(HEADER_LEN);
  
  console.log('Testing if key depends on previous plaintext:');
  console.log(`aa: ${decAA.toString('hex')}`);
  console.log(`ab: ${decAB.toString('hex')}`);
  
  // First byte should be the same (same first plaintext char)
  console.log(`First byte same: ${decAA[0] === decAB[0]}`);
  
  // Second byte - if key depends on prev plaintext, should be same
  // (both have 'a' as first char)
  const key2_aa = decAA[1] ^ 'a'.charCodeAt(0);
  const key2_ab = decAB[1] ^ 'b'.charCodeAt(0);
  console.log(`Key at pos 1 for 'aa': ${key2_aa.toString(16)}`);
  console.log(`Key at pos 1 for 'ab': ${key2_ab.toString(16)}`);
  console.log(`Key depends on prev plaintext: ${key2_aa === key2_ab}`);
  
  // Test with 'ba' vs 'ca' - different first char, same second
  const encBA = await encryptKai('ba');
  const encCA = await encryptKai('ca');
  
  const decBA = urlSafeBase64Decode(encBA).slice(HEADER_LEN);
  const decCA = urlSafeBase64Decode(encCA).slice(HEADER_LEN);
  
  console.log('\nTesting if key depends on previous ciphertext:');
  console.log(`ba: ${decBA.toString('hex')}`);
  console.log(`ca: ${decCA.toString('hex')}`);
  
  const key2_ba = decBA[1] ^ 'a'.charCodeAt(0);
  const key2_ca = decCA[1] ^ 'a'.charCodeAt(0);
  console.log(`Key at pos 1 for 'ba': ${key2_ba.toString(16)}`);
  console.log(`Key at pos 1 for 'ca': ${key2_ca.toString(16)}`);
  console.log(`Key depends on prev ciphertext: ${key2_ba !== key2_ca}`);
  
  // If key depends on prev ciphertext, let's verify
  console.log('\n=== CFB Mode Verification ===\n');
  
  // In CFB mode: C[i] = P[i] XOR E(C[i-1])
  // So: key[i] = E(C[i-1])
  
  // Let's see if there's a pattern
  const testCases = [
    { str: 'aa', desc: 'aa' },
    { str: 'ab', desc: 'ab' },
    { str: 'ba', desc: 'ba' },
    { str: 'bb', desc: 'bb' },
  ];
  
  for (const tc of testCases) {
    const enc = await encryptKai(tc.str);
    const dec = urlSafeBase64Decode(enc).slice(HEADER_LEN);
    
    const c0 = dec[0];
    const c1 = dec[1];
    const p0 = tc.str.charCodeAt(0);
    const p1 = tc.str.charCodeAt(1);
    const k0 = c0 ^ p0;
    const k1 = c1 ^ p1;
    
    console.log(`${tc.desc}: C0=${c0.toString(16)} C1=${c1.toString(16)} | K0=${k0.toString(16)} K1=${k1.toString(16)} | C0^K1=${(c0^k1).toString(16)}`);
  }
  
  // Let's try to find the relationship between C[0] and K[1]
  console.log('\n=== Finding Key Derivation Function ===\n');
  
  // Collect more data points
  const dataPoints = [];
  for (const firstChar of 'abcdefghij') {
    const str = firstChar + 'a';
    const enc = await encryptKai(str);
    const dec = urlSafeBase64Decode(enc).slice(HEADER_LEN);
    
    const c0 = dec[0];
    const c1 = dec[1];
    const p0 = firstChar.charCodeAt(0);
    const p1 = 'a'.charCodeAt(0);
    const k0 = c0 ^ p0;
    const k1 = c1 ^ p1;
    
    dataPoints.push({ firstChar, c0, c1, p0, p1, k0, k1 });
  }
  
  console.log('First char | C0  | K0  | K1  | C0 XOR K1 | K0 XOR K1');
  console.log('-----------|-----|-----|-----|-----------|----------');
  for (const dp of dataPoints) {
    console.log(`    ${dp.firstChar}      | ${dp.c0.toString(16).padStart(2,'0')}  | ${dp.k0.toString(16).padStart(2,'0')}  | ${dp.k1.toString(16).padStart(2,'0')}  |    ${(dp.c0^dp.k1).toString(16).padStart(2,'0')}     |    ${(dp.k0^dp.k1).toString(16).padStart(2,'0')}`);
  }
  
  // Check if K1 = f(C0) for some simple function
  console.log('\n=== Testing Simple Key Derivation Functions ===\n');
  
  // Test: K1 = C0 XOR constant
  const k1Values = dataPoints.map(dp => dp.k1);
  const c0Values = dataPoints.map(dp => dp.c0);
  
  // Find if there's a constant XOR relationship
  const xorDiffs = dataPoints.map(dp => dp.c0 ^ dp.k1);
  const allSameXor = xorDiffs.every(d => d === xorDiffs[0]);
  console.log(`K1 = C0 XOR constant: ${allSameXor} (constant would be ${xorDiffs[0].toString(16)})`);
  
  // Test: K1 = K0 XOR constant
  const k0k1Diffs = dataPoints.map(dp => dp.k0 ^ dp.k1);
  const allSameK0K1 = k0k1Diffs.every(d => d === k0k1Diffs[0]);
  console.log(`K1 = K0 XOR constant: ${allSameK0K1} (constant would be ${k0k1Diffs[0].toString(16)})`);
  
  // Test: K1 = P0 XOR constant
  const p0k1Diffs = dataPoints.map(dp => dp.p0 ^ dp.k1);
  const allSameP0K1 = p0k1Diffs.every(d => d === p0k1Diffs[0]);
  console.log(`K1 = P0 XOR constant: ${allSameP0K1} (constant would be ${p0k1Diffs[0].toString(16)})`);
  
  // The key derivation is more complex - let's look at the actual values
  console.log('\n=== Raw Key Values ===\n');
  console.log('K1 values:', k1Values.map(k => k.toString(16).padStart(2, '0')).join(' '));
  console.log('C0 values:', c0Values.map(c => c.toString(16).padStart(2, '0')).join(' '));
  
  // Check if K1 follows a pattern based on position in some table
  // The key might be derived from a lookup table indexed by C0
}

main().catch(console.error);
