/**
 * AnimeKai Reverse Engineering v4
 * 
 * Strategy: Since the encryption is complex, let's try to understand it by:
 * 1. Looking at the relationship between input length and output structure
 * 2. Finding patterns in the cipher bytes
 * 3. Trying to identify the algorithm (AES, ChaCha, custom?)
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
  console.log('=== AnimeKai Cipher Structure Analysis ===\n');
  
  // Test various input lengths to understand the block structure
  const lengths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30];
  
  console.log('Input Length | Output Bytes | Data Bytes | Block Pattern');
  console.log('-------------|--------------|------------|---------------');
  
  for (const len of lengths) {
    const input = 'a'.repeat(len);
    const enc = await encryptKai(input);
    const dec = urlSafeBase64Decode(enc);
    const dataLen = dec.length - HEADER_LEN;
    
    // Calculate block pattern
    const blocks = Math.ceil(dataLen / 4);
    const pattern = `${blocks} blocks of ~4 bytes`;
    
    console.log(`     ${len.toString().padStart(2)}       |      ${dec.length.toString().padStart(2)}      |     ${dataLen.toString().padStart(2)}      | ${pattern}`);
  }
  
  console.log('\n=== Block Boundary Analysis ===\n');
  
  // The output seems to grow in chunks - let's find the block size
  const results = [];
  for (let i = 1; i <= 20; i++) {
    const input = 'a'.repeat(i);
    const enc = await encryptKai(input);
    const dec = urlSafeBase64Decode(enc);
    results.push({ inputLen: i, outputLen: dec.length - HEADER_LEN });
  }
  
  console.log('Looking for block boundaries:');
  for (let i = 1; i < results.length; i++) {
    const diff = results[i].outputLen - results[i-1].outputLen;
    if (diff !== 1) {
      console.log(`  Input ${results[i].inputLen}: output jumped by ${diff} bytes (from ${results[i-1].outputLen} to ${results[i].outputLen})`);
    }
  }
  
  console.log('\n=== Constant Bytes Analysis ===\n');
  
  // Check which bytes are constant across different inputs
  const samples = [];
  for (const input of ['aaaa', 'bbbb', 'cccc', '1234', 'test', 'abcd']) {
    const enc = await encryptKai(input);
    const dec = urlSafeBase64Decode(enc);
    samples.push({ input, data: dec.slice(HEADER_LEN) });
  }
  
  // Find constant bytes
  const maxLen = Math.max(...samples.map(s => s.data.length));
  console.log('Byte positions that are constant across all samples:');
  
  for (let i = 0; i < maxLen; i++) {
    const bytes = samples.map(s => s.data[i]).filter(b => b !== undefined);
    const allSame = bytes.every(b => b === bytes[0]);
    if (allSame && bytes.length === samples.length) {
      console.log(`  Byte ${i}: ${bytes[0].toString(16).padStart(2, '0')} (constant)`);
    }
  }
  
  console.log('\n=== Trying to Identify the Algorithm ===\n');
  
  // The structure suggests this might be:
  // 1. A stream cipher with a complex key schedule
  // 2. A block cipher in a streaming mode
  // 3. A custom algorithm
  
  // Let's check if it's related to RC4 (common in web crypto)
  // RC4 produces output byte-by-byte with no padding
  
  // Or it could be ChaCha20 (20 rounds, 64-byte blocks)
  // Or AES-CTR (16-byte blocks)
  
  // The output structure (1->1, 2->8, 3->12, 4->14) doesn't match standard block sizes
  // This suggests a custom algorithm or a combination
  
  // Let's look at the relationship between consecutive cipher bytes
  console.log('Analyzing cipher byte relationships:');
  
  const testInput = 'abcdefgh';
  const testEnc = await encryptKai(testInput);
  const testDec = urlSafeBase64Decode(testEnc);
  const testData = testDec.slice(HEADER_LEN);
  
  console.log(`Input: "${testInput}"`);
  console.log(`Cipher: ${testData.toString('hex')}`);
  
  // XOR consecutive cipher bytes
  console.log('\nConsecutive XOR:');
  for (let i = 0; i < testData.length - 1; i++) {
    const xor = testData[i] ^ testData[i + 1];
    console.log(`  C[${i}] ^ C[${i+1}] = ${testData[i].toString(16)} ^ ${testData[i+1].toString(16)} = ${xor.toString(16)}`);
  }
  
  // Check if there's a relationship with the plaintext
  console.log('\nPlaintext-Cipher relationship:');
  for (let i = 0; i < testInput.length; i++) {
    const p = testInput.charCodeAt(i);
    const c = testData[i];
    const xor = p ^ c;
    console.log(`  P[${i}]='${testInput[i]}' (${p.toString(16)}) ^ C[${i}]=${c.toString(16)} = ${xor.toString(16)}`);
  }
  
  console.log('\n=== Testing Decryption Hypothesis ===\n');
  
  // Hypothesis: The cipher might use a key derived from the header
  // Let's see if the header contains any useful information
  
  const header = testDec.slice(0, HEADER_LEN);
  console.log('Header:', header.toString('hex'));
  
  // Try using header bytes as key
  console.log('\nTrying header as key:');
  for (let offset = 0; offset < HEADER_LEN; offset++) {
    const decrypted = Buffer.alloc(testInput.length);
    let match = true;
    for (let i = 0; i < testInput.length; i++) {
      decrypted[i] = testData[i] ^ header[(offset + i) % HEADER_LEN];
      if (decrypted[i] !== testInput.charCodeAt(i)) {
        match = false;
      }
    }
    if (match) {
      console.log(`  Header offset ${offset}: MATCH!`);
    }
  }
  
  // The cipher is definitely custom - let's try to find the pattern
  // by looking at how the same plaintext byte encrypts at different positions
  
  console.log('\n=== Same Byte at Different Positions ===\n');
  
  const sameByteInputs = ['a', 'xa', 'xxa', 'xxxa', 'xxxxa'];
  
  for (const input of sameByteInputs) {
    const enc = await encryptKai(input);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    const aPos = input.indexOf('a');
    const aByte = data[aPos];
    const key = aByte ^ 'a'.charCodeAt(0);
    console.log(`"${input}" - 'a' at pos ${aPos}: cipher=${aByte.toString(16)}, key=${key.toString(16)}`);
  }
}

main().catch(console.error);
