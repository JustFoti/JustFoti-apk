/**
 * AnimeKai Key Generation Analysis
 * 
 * Key findings:
 * - Position 0: key = 0x2d
 * - Position 1: key = 0x93 (for 'a' after 'x')
 * - Position 2: key = 0xbe
 * - Position 3: key = 0xfa
 * - Position 4: key = 0xfc
 * 
 * The key depends on position. Let's find the full key schedule.
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
  console.log('=== Deriving the Key Schedule ===\n');
  
  // To find the key at each position, we'll encrypt strings where we know
  // the plaintext at each position
  
  // Use 'a' (0x61) as our known byte
  const knownByte = 'a';
  const knownCode = knownByte.charCodeAt(0);
  
  // Generate test strings: 'a', 'xa', 'xxa', 'xxxa', etc.
  // where 'x' is a filler and 'a' is at different positions
  
  const keySchedule = [];
  
  for (let pos = 0; pos < 50; pos++) {
    // Create a string with 'a' at position `pos`
    const filler = 'x'.repeat(pos);
    const testStr = filler + knownByte;
    
    const enc = await encryptKai(testStr);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    
    // The cipher byte at position `pos` is data[pos]
    const cipherByte = data[pos];
    const keyByte = cipherByte ^ knownCode;
    
    keySchedule.push(keyByte);
    
    if (pos < 20 || pos % 10 === 0) {
      console.log(`Position ${pos.toString().padStart(2)}: cipher=${cipherByte.toString(16).padStart(2, '0')}, key=${keyByte.toString(16).padStart(2, '0')}`);
    }
  }
  
  console.log('\n=== Full Key Schedule (first 50 bytes) ===\n');
  console.log('Key:', keySchedule.map(k => k.toString(16).padStart(2, '0')).join(' '));
  
  // Check if the key repeats
  console.log('\n=== Checking for Key Repetition ===\n');
  
  for (let period = 1; period <= 25; period++) {
    let matches = 0;
    for (let i = 0; i < keySchedule.length - period; i++) {
      if (keySchedule[i] === keySchedule[i + period]) {
        matches++;
      }
    }
    const matchRate = matches / (keySchedule.length - period);
    if (matchRate > 0.8) {
      console.log(`Period ${period}: ${(matchRate * 100).toFixed(1)}% match`);
    }
  }
  
  // Test the key schedule by encrypting a known string
  console.log('\n=== Testing Key Schedule ===\n');
  
  const testStr = 'hello world';
  const testEnc = await encryptKai(testStr);
  const testDec = urlSafeBase64Decode(testEnc);
  const testData = testDec.slice(HEADER_LEN);
  
  console.log(`Input: "${testStr}"`);
  console.log(`Cipher: ${testData.slice(0, testStr.length).toString('hex')}`);
  
  // Decrypt using our key schedule
  const decrypted = Buffer.alloc(testStr.length);
  for (let i = 0; i < testStr.length; i++) {
    decrypted[i] = testData[i] ^ keySchedule[i];
  }
  console.log(`Decrypted: "${decrypted.toString('utf8')}"`);
  console.log(`Match: ${decrypted.toString('utf8') === testStr ? '✓ SUCCESS!' : '✗ FAILED'}`);
  
  // Now let's implement encryption
  console.log('\n=== Testing Encryption ===\n');
  
  const toEncrypt = 'test123';
  const encrypted = Buffer.alloc(toEncrypt.length);
  for (let i = 0; i < toEncrypt.length; i++) {
    encrypted[i] = toEncrypt.charCodeAt(i) ^ keySchedule[i];
  }
  console.log(`To encrypt: "${toEncrypt}"`);
  console.log(`Our encryption: ${encrypted.toString('hex')}`);
  
  // Compare with API
  const apiEnc = await encryptKai(toEncrypt);
  const apiDec = urlSafeBase64Decode(apiEnc);
  const apiData = apiDec.slice(HEADER_LEN);
  console.log(`API encryption: ${apiData.slice(0, toEncrypt.length).toString('hex')}`);
  console.log(`Match: ${encrypted.toString('hex') === apiData.slice(0, toEncrypt.length).toString('hex') ? '✓ SUCCESS!' : '✗ FAILED'}`);
  
  // Export the key schedule
  console.log('\n=== Exportable Key Schedule ===\n');
  console.log('const ANIMEKAI_KEY = Buffer.from([');
  for (let i = 0; i < keySchedule.length; i += 16) {
    const chunk = keySchedule.slice(i, i + 16);
    console.log('  ' + chunk.map(k => '0x' + k.toString(16).padStart(2, '0')).join(', ') + ',');
  }
  console.log(']);');
}

main().catch(console.error);
