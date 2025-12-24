/**
 * Build complete substitution tables for AnimeKai encryption
 * This script generates tables for positions 0-19 to handle longer strings
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

// Map plaintext position to cipher position
function getCipherPosition(plainPos) {
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
  console.log('Building substitution tables for positions 0-19...\n');
  
  const tables = {};
  
  for (let pos = 0; pos < 20; pos++) {
    tables[pos] = {};
    
    // Use a prefix of 'a's to get the char at the right position
    const prefix = 'a'.repeat(pos);
    
    // Test all printable ASCII chars
    for (let i = 32; i < 127; i++) {
      const char = String.fromCharCode(i);
      if (char === '%') continue; // Skip problematic chars
      
      try {
        const enc = await encryptKai(prefix + char);
        const dec = urlSafeBase64Decode(enc);
        const data = dec.slice(HEADER_LEN);
        
        const cipherPos = getCipherPosition(pos);
        const cipherByte = data[cipherPos];
        
        if (cipherByte !== undefined) {
          tables[pos][char] = cipherByte;
        }
      } catch (e) {
        // Skip errors
      }
    }
    
    console.log(`Position ${pos}: ${Object.keys(tables[pos]).length} entries`);
  }
  
  // Output as JavaScript
  console.log('\n// Substitution tables for AnimeKai encryption');
  console.log('const ENCRYPT_TABLES = {');
  
  for (let pos = 0; pos < 20; pos++) {
    const entries = Object.entries(tables[pos])
      .map(([char, byte]) => {
        const escapedChar = char === "'" ? "\\'" : char === '\\' ? '\\\\' : char;
        return `'${escapedChar}':0x${byte.toString(16).padStart(2, '0')}`;
      })
      .join(',');
    console.log(`  ${pos}: {${entries}},`);
  }
  
  console.log('};');
  
  // Also output reverse tables
  console.log('\n// Reverse tables for decryption');
  console.log('const DECRYPT_TABLES = {};');
  console.log('for (const [pos, table] of Object.entries(ENCRYPT_TABLES)) {');
  console.log('  DECRYPT_TABLES[pos] = {};');
  console.log('  for (const [char, byte] of Object.entries(table)) {');
  console.log('    DECRYPT_TABLES[pos][byte] = char;');
  console.log('  }');
  console.log('}');
}

main().catch(console.error);
