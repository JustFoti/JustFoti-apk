/**
 * AnimeKai Constant Bytes Analysis
 * 
 * DISCOVERY: Bytes 1-6 of the cipher are CONSTANT: f2 df 9b 9d 16 e5
 * Only byte 0 and bytes 7+ vary based on input.
 * 
 * This is a very unusual cipher structure!
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
  console.log('=== Constant Bytes Analysis ===\n');
  
  // Test various inputs and look at the cipher structure
  const testCases = [
    'a', 'b', 'c',
    'aa', 'ab', 'ba', 'bb',
    'aaa', 'abc', 'xyz',
    'aaaa', 'abcd', 'test', '1234',
    'hello', 'world',
  ];
  
  console.log('Input    | Cipher bytes (hex)');
  console.log('---------|' + '-'.repeat(60));
  
  for (const tc of testCases) {
    const enc = await encryptKai(tc);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    console.log(`${tc.padEnd(8)} | ${data.toString('hex')}`);
  }
  
  // Analyze the structure
  console.log('\n=== Structure Analysis ===\n');
  
  // The cipher seems to have:
  // - Byte 0: varies based on first plaintext char
  // - Bytes 1-6: CONSTANT (f2 df 9b 9d 16 e5)
  // - Byte 7+: varies based on plaintext
  
  // Let's verify the constant bytes
  const samples = [];
  for (const tc of testCases.filter(t => t.length >= 2)) {
    const enc = await encryptKai(tc);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    samples.push({ input: tc, data });
  }
  
  console.log('Checking which byte positions are constant:');
  const maxLen = Math.max(...samples.map(s => s.data.length));
  
  for (let i = 0; i < Math.min(maxLen, 20); i++) {
    const bytes = samples.map(s => s.data[i]).filter(b => b !== undefined);
    const allSame = bytes.length > 1 && bytes.every(b => b === bytes[0]);
    const uniqueCount = new Set(bytes).size;
    console.log(`  Byte ${i.toString().padStart(2)}: ${allSame ? `CONSTANT (${bytes[0].toString(16).padStart(2, '0')})` : `varies (${uniqueCount} unique values)`}`);
  }
  
  // The structure suggests this might be:
  // [encrypted_first_char] [constant_padding] [encrypted_rest]
  
  console.log('\n=== Hypothesis: Split Encryption ===\n');
  
  // Maybe the cipher encrypts the first char separately, then adds padding,
  // then encrypts the rest?
  
  // Let's check if byte 7 depends on the second char
  const byte7Tests = [
    { input: 'aa', expected: 'second char is a' },
    { input: 'ab', expected: 'second char is b' },
    { input: 'ac', expected: 'second char is c' },
    { input: 'ba', expected: 'second char is a' },
    { input: 'ca', expected: 'second char is a' },
  ];
  
  console.log('Byte 7 analysis (should depend on second char):');
  for (const test of byte7Tests) {
    const enc = await encryptKai(test.input);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    const byte7 = data[7];
    const secondChar = test.input[1];
    const key7 = byte7 ^ secondChar.charCodeAt(0);
    console.log(`  "${test.input}": byte7=${byte7.toString(16).padStart(2, '0')}, second='${secondChar}' (${secondChar.charCodeAt(0).toString(16)}), key=${key7.toString(16).padStart(2, '0')}`);
  }
  
  // Check if the key at position 7 is constant
  const key7Values = [];
  for (const test of byte7Tests) {
    const enc = await encryptKai(test.input);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    const byte7 = data[7];
    const secondChar = test.input[1];
    const key7 = byte7 ^ secondChar.charCodeAt(0);
    key7Values.push(key7);
  }
  
  const allKey7Same = key7Values.every(k => k === key7Values[0]);
  console.log(`\nKey at position 7 is constant: ${allKey7Same} (value: ${key7Values[0].toString(16)})`);
  
  // If key at position 7 is constant, we can derive the full key schedule
  // by encrypting a known string and XORing with the plaintext
  
  console.log('\n=== Deriving Key Schedule from Known Plaintext ===\n');
  
  // The structure seems to be:
  // Output = [C0] [CONST_1-6] [C7] [C8] ... [Cn] [TRAILER]
  // Where C0 = P0 XOR K0, C7 = P1 XOR K7, C8 = P2 XOR K8, etc.
  
  // So the mapping is:
  // Plaintext position 0 -> Cipher position 0
  // Plaintext position 1 -> Cipher position 7
  // Plaintext position 2 -> Cipher position 8
  // etc.
  
  // Let's verify this mapping
  const mappingTest = 'abcdefghij';
  const mappingEnc = await encryptKai(mappingTest);
  const mappingDec = urlSafeBase64Decode(mappingEnc);
  const mappingData = mappingDec.slice(HEADER_LEN);
  
  console.log(`Test string: "${mappingTest}"`);
  console.log(`Cipher: ${mappingData.toString('hex')}`);
  
  // Try to find where each plaintext char maps to
  console.log('\nFinding plaintext-to-cipher mapping:');
  
  for (let pPos = 0; pPos < mappingTest.length; pPos++) {
    const pChar = mappingTest[pPos];
    const pCode = pChar.charCodeAt(0);
    
    // Try each cipher position
    for (let cPos = 0; cPos < mappingData.length; cPos++) {
      const cByte = mappingData[cPos];
      const key = cByte ^ pCode;
      
      // Check if this key is consistent with other inputs
      // For now, just print the XOR result
      if (cPos === 0 || cPos >= 7) {
        // Only check non-constant positions
      }
    }
  }
  
  // Let's try a simpler approach: encrypt single chars and see the pattern
  console.log('\n=== Single Char Encryption Pattern ===\n');
  
  for (const char of 'abcdefghij') {
    const enc = await encryptKai(char);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    const key = data[0] ^ char.charCodeAt(0);
    console.log(`'${char}' (${char.charCodeAt(0).toString(16)}): cipher[0]=${data[0].toString(16).padStart(2, '0')}, key=${key.toString(16).padStart(2, '0')}`);
  }
  
  // The key at position 0 varies! Let's see if there's a pattern
  console.log('\n=== Key at Position 0 Pattern ===\n');
  
  const key0Values = [];
  for (let i = 0; i < 256; i++) {
    const char = String.fromCharCode(i);
    if (char.match(/[\x00-\x1f\x7f-\xff]/)) continue; // Skip control chars
    
    try {
      const enc = await encryptKai(char);
      const dec = urlSafeBase64Decode(enc);
      const data = dec.slice(HEADER_LEN);
      const key = data[0] ^ i;
      key0Values.push({ charCode: i, key });
    } catch (e) {
      // Skip errors
    }
  }
  
  // Check if key0 follows a pattern
  console.log('Key0 values for printable ASCII:');
  const printableKeys = key0Values.filter(k => k.charCode >= 0x20 && k.charCode <= 0x7e);
  console.log(printableKeys.slice(0, 20).map(k => `${String.fromCharCode(k.charCode)}:${k.key.toString(16)}`).join(' '));
  
  // Check if key0 = charCode XOR constant
  const key0Diffs = printableKeys.map(k => k.charCode ^ k.key);
  const allSameKey0 = key0Diffs.every(d => d === key0Diffs[0]);
  console.log(`\nKey0 = charCode XOR constant: ${allSameKey0} (constant would be ${key0Diffs[0].toString(16)})`);
}

main().catch(console.error);
