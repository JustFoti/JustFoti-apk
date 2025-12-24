/**
 * Build extended substitution tables for positions 20-99
 * This will take a while due to API rate limits
 */
const https = require('https');

function encryptKai(text) {
  return new Promise((resolve, reject) => {
    https.get(`https://enc-dec.app/api/enc-kai?text=${encodeURIComponent(text)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).result); } catch(e) { reject(e); }
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

function getCipherPosition(plainPos) {
  if (plainPos === 0) return 0;
  if (plainPos === 1) return 7;
  if (plainPos === 2) return 11;
  if (plainPos === 3) return 13;
  if (plainPos === 4) return 15;
  if (plainPos === 5) return 17;
  if (plainPos === 6) return 19;
  return 20 + (plainPos - 7);
}

async function main() {
  const startPos = parseInt(process.argv[2]) || 20;
  const endPos = parseInt(process.argv[3]) || 40;
  
  console.log(`Building tables for positions ${startPos}-${endPos-1}...\n`);
  
  const tables = {};
  
  for (let pos = startPos; pos < endPos; pos++) {
    tables[pos] = {};
    const prefix = 'a'.repeat(pos);
    
    // Test common chars first (alphanumeric + common symbols)
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !"#$&\'()*+,-./:;<=>?@[\\]^_`{|}~';
    
    for (const char of chars) {
      if (char === '%') continue;
      
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
  console.log('\n// Extended tables');
  for (let pos = startPos; pos < endPos; pos++) {
    const entries = Object.entries(tables[pos])
      .map(([char, byte]) => {
        const escapedChar = char === "'" ? "\\'" : char === '\\' ? '\\\\' : char;
        return `'${escapedChar}':0x${byte.toString(16).padStart(2, '0')}`;
      })
      .join(',');
    console.log(`  ${pos}: {${entries}},`);
  }
}

main().catch(console.error);
