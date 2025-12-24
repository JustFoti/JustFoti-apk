/**
 * AnimeKai Deep Crypto Analysis
 * 
 * Findings so far:
 * - Header is constant: c509bdb497cbc06873ff412af12fd8007624c29faa (21 bytes)
 * - Key varies by position AND plaintext
 * - Not a simple XOR cipher
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
  console.log('=== Deep Crypto Analysis ===\n');
  
  // Test with sequential characters to find the pattern
  const chars = 'abcdefghij';
  const results = [];
  
  for (const char of chars) {
    const enc = await encryptKai(char);
    const dec = urlSafeBase64Decode(enc);
    const dataByte = dec[HEADER_LEN];
    results.push({ char, dataByte, charCode: char.charCodeAt(0) });
  }
  
  console.log('Single char analysis:');
  console.log('Char | CharCode | DataByte | XOR Key');
  console.log('-----|----------|----------|--------');
  for (const r of results) {
    const key = r.dataByte ^ r.charCode;
    console.log(`  ${r.char}  |    ${r.charCode.toString(16).padStart(2, '0')}    |    ${r.dataByte.toString(16).padStart(2, '0')}    |   ${key.toString(16).padStart(2, '0')}`);
  }
  
  // The XOR key varies! Let's see if there's a pattern
  console.log('\n=== Key Pattern Analysis ===\n');
  
  // Test: maybe the key depends on the previous ciphertext byte?
  // This would be a CBC-like mode
  
  // Get 'ab' and compare
  const encAB = await encryptKai('ab');
  const decAB = urlSafeBase64Decode(encAB);
  
  const encA = await encryptKai('a');
  const decA = urlSafeBase64Decode(encA);
  
  console.log('Comparing "a" vs "ab":');
  console.log(`a:  ${decA.slice(HEADER_LEN).toString('hex')}`);
  console.log(`ab: ${decAB.slice(HEADER_LEN).toString('hex')}`);
  
  // First byte should be the same
  console.log(`First byte same: ${decA[HEADER_LEN] === decAB[HEADER_LEN]}`);
  
  // Check if second byte of 'ab' depends on first byte
  const firstCipherByte = decAB[HEADER_LEN];
  const secondCipherByte = decAB[HEADER_LEN + 1];
  const secondPlainByte = 'b'.charCodeAt(0);
  
  console.log(`\nSecond byte analysis:`);
  console.log(`  First cipher byte: ${firstCipherByte.toString(16)}`);
  console.log(`  Second cipher byte: ${secondCipherByte.toString(16)}`);
  console.log(`  Second plain byte: ${secondPlainByte.toString(16)} ('b')`);
  console.log(`  XOR key for second byte: ${(secondCipherByte ^ secondPlainByte).toString(16)}`);
  
  // Test: is the key derived from previous cipher byte?
  const possibleKey = firstCipherByte ^ secondPlainByte;
  console.log(`  If key = prev_cipher ^ plain: ${possibleKey.toString(16)}`);
  console.log(`  Actual second cipher: ${secondCipherByte.toString(16)}`);
  
  // Test with 'ba' to see if order matters
  const encBA = await encryptKai('ba');
  const decBA = urlSafeBase64Decode(encBA);
  
  console.log(`\nComparing "ab" vs "ba":`);
  console.log(`ab: ${decAB.slice(HEADER_LEN).toString('hex')}`);
  console.log(`ba: ${decBA.slice(HEADER_LEN).toString('hex')}`);
  
  // Test with longer strings to find the pattern
  console.log('\n=== Longer String Analysis ===\n');
  
  const testStrings = ['aaaa', 'abcd', '1234', 'test'];
  
  for (const str of testStrings) {
    const enc = await encryptKai(str);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    
    console.log(`"${str}":`);
    console.log(`  Cipher: ${data.toString('hex')}`);
    
    // Calculate XOR key for each position
    const keys = [];
    for (let i = 0; i < str.length; i++) {
      keys.push(data[i] ^ str.charCodeAt(i));
    }
    console.log(`  Keys:   ${keys.map(k => k.toString(16).padStart(2, '0')).join(' ')}`);
    console.log();
  }
  
  // Test: maybe it's a rolling XOR with the key from window.__$
  console.log('=== Testing with Known Key ===\n');
  
  // The key from window.__$ (decoded)
  const KEY = Buffer.from('65961d6d76a08c4a5e691e12179abb0b8562221fba2019f107786c8564d1da4f3e65a14c740271d31cf136364bdb5cbdc67d99ee6d55fe321011632600cf196f4b8cf527bc52be12a2724b75a7016a1e18', 'hex');
  
  console.log('Key from window.__$:', KEY.toString('hex'));
  console.log('Key length:', KEY.length, 'bytes');
  
  // Try XOR with key at different offsets
  const testEnc = await encryptKai('test');
  const testDec = urlSafeBase64Decode(testEnc);
  const testData = testDec.slice(HEADER_LEN);
  const testPlain = Buffer.from('test', 'utf8');
  
  console.log('\nTrying key offsets for "test":');
  for (let offset = 0; offset < 30; offset++) {
    const decrypted = Buffer.alloc(4);
    for (let i = 0; i < 4; i++) {
      decrypted[i] = testData[i] ^ KEY[(offset + i) % KEY.length];
    }
    if (decrypted.toString('utf8') === 'test') {
      console.log(`  Offset ${offset}: MATCH!`);
    }
  }
  
  // The cipher might use a more complex key schedule
  console.log('\n=== Cipher Structure Analysis ===\n');
  
  // Look at the trailer bytes (after plaintext)
  const enc1 = await encryptKai('a');
  const enc2 = await encryptKai('aa');
  const enc3 = await encryptKai('aaa');
  
  const dec1 = urlSafeBase64Decode(enc1);
  const dec2 = urlSafeBase64Decode(enc2);
  const dec3 = urlSafeBase64Decode(enc3);
  
  console.log('Trailer analysis:');
  console.log(`a (1 char):   ${dec1.slice(HEADER_LEN).toString('hex')} (${dec1.length - HEADER_LEN} bytes)`);
  console.log(`aa (2 chars): ${dec2.slice(HEADER_LEN).toString('hex')} (${dec2.length - HEADER_LEN} bytes)`);
  console.log(`aaa (3 chars): ${dec3.slice(HEADER_LEN).toString('hex')} (${dec3.length - HEADER_LEN} bytes)`);
  
  // The output grows by more than 1 byte per input byte
  // This suggests there's padding or a MAC
  console.log('\nOutput size analysis:');
  console.log(`1 char -> ${dec1.length - HEADER_LEN} bytes (+${dec1.length - HEADER_LEN - 1} overhead)`);
  console.log(`2 chars -> ${dec2.length - HEADER_LEN} bytes (+${dec2.length - HEADER_LEN - 2} overhead)`);
  console.log(`3 chars -> ${dec3.length - HEADER_LEN} bytes (+${dec3.length - HEADER_LEN - 3} overhead)`);
}

main().catch(console.error);
