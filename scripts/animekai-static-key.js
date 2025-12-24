/**
 * AnimeKai Static Key Discovery
 * 
 * BREAKTHROUGH: K1 is constant (0x93) regardless of the first character!
 * This means the key schedule is STATIC, not feedback-based.
 * 
 * The earlier test failed because we used 'x' as filler, which has a different
 * key than 'a'. Let's derive the correct static key.
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

function urlSafeBase64Encode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const HEADER_LEN = 21;
const HEADER = Buffer.from('c509bdb497cbc06873ff412af12fd8007624c29faa', 'hex');

async function main() {
  console.log('=== Deriving Static Key Schedule ===\n');
  
  // Use a long string of 'a's to derive the key at each position
  const testLen = 100;
  const testStr = 'a'.repeat(testLen);
  
  const enc = await encryptKai(testStr);
  const dec = urlSafeBase64Decode(enc);
  const data = dec.slice(HEADER_LEN);
  
  console.log(`Encrypted ${testLen} 'a's`);
  console.log(`Output data length: ${data.length} bytes`);
  
  // Derive key at each position
  const keySchedule = [];
  const knownCode = 'a'.charCodeAt(0);
  
  for (let i = 0; i < data.length && i < testLen; i++) {
    const key = data[i] ^ knownCode;
    keySchedule.push(key);
  }
  
  console.log('\nKey schedule (first 50 bytes):');
  console.log(keySchedule.slice(0, 50).map(k => k.toString(16).padStart(2, '0')).join(' '));
  
  // Verify with a different string
  console.log('\n=== Verification ===\n');
  
  const verifyStr = 'hello world test 123';
  const verifyEnc = await encryptKai(verifyStr);
  const verifyDec = urlSafeBase64Decode(verifyEnc);
  const verifyData = verifyDec.slice(HEADER_LEN);
  
  console.log(`Test string: "${verifyStr}"`);
  console.log(`Cipher data: ${verifyData.slice(0, verifyStr.length).toString('hex')}`);
  
  // Decrypt using our key schedule
  const decrypted = Buffer.alloc(verifyStr.length);
  for (let i = 0; i < verifyStr.length; i++) {
    decrypted[i] = verifyData[i] ^ keySchedule[i];
  }
  console.log(`Decrypted:   "${decrypted.toString('utf8')}"`);
  console.log(`Match: ${decrypted.toString('utf8') === verifyStr ? '✓ SUCCESS!' : '✗ FAILED'}`);
  
  // Test encryption
  console.log('\n=== Testing Encryption ===\n');
  
  const toEncrypt = 'test123';
  const encrypted = Buffer.alloc(toEncrypt.length);
  for (let i = 0; i < toEncrypt.length; i++) {
    encrypted[i] = toEncrypt.charCodeAt(i) ^ keySchedule[i];
  }
  
  // Build full output (header + encrypted data)
  // Note: The API adds trailer bytes, but for encryption we just need the core
  const fullOutput = Buffer.concat([HEADER, encrypted]);
  const encodedOutput = urlSafeBase64Encode(fullOutput);
  
  console.log(`To encrypt: "${toEncrypt}"`);
  console.log(`Our encrypted data: ${encrypted.toString('hex')}`);
  
  // Compare with API
  const apiEnc = await encryptKai(toEncrypt);
  const apiDec = urlSafeBase64Decode(apiEnc);
  const apiData = apiDec.slice(HEADER_LEN, HEADER_LEN + toEncrypt.length);
  
  console.log(`API encrypted data: ${apiData.toString('hex')}`);
  console.log(`Data match: ${encrypted.toString('hex') === apiData.toString('hex') ? '✓ SUCCESS!' : '✗ FAILED'}`);
  
  // Export the key schedule
  console.log('\n=== Exportable Key Schedule ===\n');
  
  // Get a longer key schedule
  const longStr = 'a'.repeat(200);
  const longEnc = await encryptKai(longStr);
  const longDec = urlSafeBase64Decode(longEnc);
  const longData = longDec.slice(HEADER_LEN);
  
  const fullKeySchedule = [];
  for (let i = 0; i < longData.length && i < 200; i++) {
    fullKeySchedule.push(longData[i] ^ knownCode);
  }
  
  console.log('// AnimeKai encryption key schedule');
  console.log('const ANIMEKAI_KEY = Buffer.from([');
  for (let i = 0; i < fullKeySchedule.length; i += 16) {
    const chunk = fullKeySchedule.slice(i, Math.min(i + 16, fullKeySchedule.length));
    const hexStr = chunk.map(k => '0x' + k.toString(16).padStart(2, '0')).join(', ');
    console.log(`  ${hexStr},`);
  }
  console.log(']);');
  
  console.log('\n// Header (constant)');
  console.log(`const ANIMEKAI_HEADER = Buffer.from('${HEADER.toString('hex')}', 'hex');`);
  
  // Test the full encryption function
  console.log('\n=== Full Encryption Test ===\n');
  
  function encryptAnimeKai(text, keySchedule) {
    const plainBytes = Buffer.from(text, 'utf8');
    const encrypted = Buffer.alloc(plainBytes.length);
    
    for (let i = 0; i < plainBytes.length; i++) {
      encrypted[i] = plainBytes[i] ^ keySchedule[i % keySchedule.length];
    }
    
    const output = Buffer.concat([HEADER, encrypted]);
    return urlSafeBase64Encode(output);
  }
  
  const testCases = ['test', 'hello', '12345', 'anime'];
  
  for (const tc of testCases) {
    const ourEnc = encryptAnimeKai(tc, fullKeySchedule);
    const apiEncResult = await encryptKai(tc);
    
    // Compare just the data portion (API adds trailer)
    const ourDec = urlSafeBase64Decode(ourEnc);
    const apiDecResult = urlSafeBase64Decode(apiEncResult);
    
    const ourData = ourDec.slice(HEADER_LEN);
    const apiDataResult = apiDecResult.slice(HEADER_LEN, HEADER_LEN + tc.length);
    
    const match = ourData.toString('hex') === apiDataResult.toString('hex');
    console.log(`"${tc}": ${match ? '✓' : '✗'} (our: ${ourData.toString('hex')}, api: ${apiDataResult.toString('hex')})`);
  }
}

main().catch(console.error);
