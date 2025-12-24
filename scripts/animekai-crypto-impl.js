/**
 * AnimeKai Encryption Implementation
 * 
 * The cipher uses position-dependent substitution tables.
 * Structure:
 * - Position 0: char 0 substitution
 * - Positions 1-6: constant (f2 df 9b 9d 16 e5)
 * - Position 7: char 1 substitution
 * - Positions 8-10: constant (67 c9 dd)
 * - Position 11: char 2 substitution
 * - Position 12: constant (9c)
 * - Position 13: char 3 substitution
 * - Position 14: constant (29)
 * - Position 15: char 4 substitution
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

function urlSafeBase64Encode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const HEADER = Buffer.from('c509bdb497cbc06873ff412af12fd8007624c29faa', 'hex');
const HEADER_LEN = 21;

// Cipher structure: maps plaintext position to cipher position
// Position 0 -> cipher[0]
// Position 1 -> cipher[7]
// Position 2 -> cipher[11]
// Position 3 -> cipher[13]
// Position 4 -> cipher[15]
// Position 5 -> cipher[17]
// Position 6 -> cipher[19]
// Position 7 -> cipher[20]
// Position 8 -> cipher[21]
// etc.

async function buildSubstitutionTables() {
  console.log('Building substitution tables...');
  
  const tables = {};
  const reverseTables = {};
  
  // Build table for each position (0-20 should be enough)
  for (let pos = 0; pos < 20; pos++) {
    tables[pos] = {};
    reverseTables[pos] = {};
    
    // Use a prefix of 'a's to get the char at the right position
    const prefix = 'a'.repeat(pos);
    
    for (let i = 32; i < 127; i++) {
      const char = String.fromCharCode(i);
      if (char === '%') continue; // Skip problematic chars
      
      try {
        const enc = await encryptKai(prefix + char);
        const dec = urlSafeBase64Decode(enc);
        const data = dec.slice(HEADER_LEN);
        
        // Find which cipher byte corresponds to this position
        // We need to figure out the mapping
        const cipherByte = data[getCipherPosition(pos)];
        
        if (cipherByte !== undefined) {
          tables[pos][char] = cipherByte;
          reverseTables[pos][cipherByte] = char;
        }
      } catch (e) {
        // Skip errors
      }
    }
    
    console.log(`  Position ${pos}: ${Object.keys(tables[pos]).length} entries`);
  }
  
  return { tables, reverseTables };
}

// Map plaintext position to cipher position
function getCipherPosition(plainPos) {
  // Based on the structure analysis:
  // pos 0 -> cipher 0
  // pos 1 -> cipher 7
  // pos 2 -> cipher 11
  // pos 3 -> cipher 13
  // pos 4 -> cipher 15
  // pos 5 -> cipher 17
  // pos 6 -> cipher 19
  // pos 7 -> cipher 20
  // pos 8 -> cipher 21
  // pos 9 -> cipher 22
  
  if (plainPos === 0) return 0;
  if (plainPos === 1) return 7;
  if (plainPos === 2) return 11;
  if (plainPos === 3) return 13;
  if (plainPos === 4) return 15;
  if (plainPos === 5) return 17;
  if (plainPos === 6) return 19;
  if (plainPos >= 7) return 20 + (plainPos - 7);
  
  return plainPos;
}

async function main() {
  console.log('=== AnimeKai Encryption Implementation ===\n');
  
  // First, let's verify the cipher position mapping
  console.log('Verifying cipher position mapping...\n');
  
  // Encrypt strings with a single different char at each position
  for (let pos = 0; pos < 10; pos++) {
    const str = 'a'.repeat(pos) + 'X' + 'a'.repeat(Math.max(0, 9 - pos));
    const enc = await encryptKai(str);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    
    // Find where 'X' appears in the cipher (it should be different from 'a')
    const baseEnc = await encryptKai('a'.repeat(10));
    const baseDec = urlSafeBase64Decode(baseEnc);
    const baseData = baseDec.slice(HEADER_LEN);
    
    // Find differing positions
    const diffs = [];
    for (let i = 0; i < Math.min(data.length, baseData.length); i++) {
      if (data[i] !== baseData[i]) {
        diffs.push(i);
      }
    }
    
    console.log(`Position ${pos} ('X' at pos ${pos}): differs at cipher positions ${diffs.join(', ')}`);
  }
  
  // Now build the full substitution tables
  console.log('\n=== Building Full Substitution Tables ===\n');
  
  const { tables, reverseTables } = await buildSubstitutionTables();
  
  // Test decryption
  console.log('\n=== Testing Decryption ===\n');
  
  const testCases = ['test', 'hello', 'anime', '12345'];
  
  for (const tc of testCases) {
    const enc = await encryptKai(tc);
    const dec = urlSafeBase64Decode(enc);
    const data = dec.slice(HEADER_LEN);
    
    // Decrypt using our tables
    let decrypted = '';
    for (let i = 0; i < tc.length; i++) {
      const cipherPos = getCipherPosition(i);
      const cipherByte = data[cipherPos];
      const plainChar = reverseTables[i]?.[cipherByte] || '?';
      decrypted += plainChar;
    }
    
    console.log(`"${tc}" -> encrypted -> decrypted: "${decrypted}" ${decrypted === tc ? '✓' : '✗'}`);
  }
  
  // Test encryption
  console.log('\n=== Testing Encryption ===\n');
  
  for (const tc of testCases) {
    // Build cipher data
    const cipherData = [];
    
    for (let i = 0; i < tc.length; i++) {
      const cipherPos = getCipherPosition(i);
      const cipherByte = tables[i]?.[tc[i]];
      
      // Fill in constant bytes up to cipherPos
      while (cipherData.length < cipherPos) {
        cipherData.push(getConstantByte(cipherData.length));
      }
      
      cipherData[cipherPos] = cipherByte || 0;
    }
    
    const ourCipher = Buffer.from(cipherData);
    
    // Compare with API
    const apiEnc = await encryptKai(tc);
    const apiDec = urlSafeBase64Decode(apiEnc);
    const apiData = apiDec.slice(HEADER_LEN);
    
    const match = ourCipher.slice(0, tc.length).toString('hex') === apiData.slice(0, tc.length).toString('hex');
    console.log(`"${tc}": our=${ourCipher.toString('hex').slice(0, 20)}... api=${apiData.toString('hex').slice(0, 20)}... ${match ? '✓' : '✗'}`);
  }
  
  // Export tables
  console.log('\n=== Exporting Tables ===\n');
  
  console.log('const ANIMEKAI_TABLES = {');
  for (let pos = 0; pos < 10; pos++) {
    const entries = Object.entries(tables[pos] || {})
      .map(([char, byte]) => `'${char === "'" ? "\\'" : char}': 0x${byte.toString(16).padStart(2, '0')}`)
      .join(', ');
    console.log(`  ${pos}: { ${entries} },`);
  }
  console.log('};');
}

// Get constant byte at a given cipher position
function getConstantByte(pos) {
  const constants = {
    1: 0xf2, 2: 0xdf, 3: 0x9b, 4: 0x9d, 5: 0x16, 6: 0xe5,
    8: 0x67, 9: 0xc9, 10: 0xdd,
    12: 0x9c,
    14: 0x29,
    16: 0x35,
    18: 0xc8,
  };
  return constants[pos] || 0x00;
}

main().catch(console.error);
