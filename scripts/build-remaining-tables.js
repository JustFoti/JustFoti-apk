/**
 * Build remaining substitution tables (100-180)
 * Run with: node scripts/build-remaining-tables.js
 * 
 * This will take a while (~5-10 minutes) as it makes many API calls.
 * Output is saved to tables-100-180.txt
 */
const https = require('https');
const fs = require('fs');

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

async function buildTable(pos) {
  const table = {};
  const prefix = 'a'.repeat(pos);
  const chars = ' !"#$&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
  
  for (const char of chars) {
    if (char === '%') continue;
    try {
      const enc = await encryptKai(prefix + char);
      const dec = urlSafeBase64Decode(enc);
      const data = dec.slice(HEADER_LEN);
      const cipherPos = getCipherPosition(pos);
      const cipherByte = data[cipherPos];
      if (cipherByte !== undefined) {
        table[char] = cipherByte;
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      console.error(`  Error at pos ${pos}, char '${char}':`, e.message);
    }
  }
  return table;
}

async function main() {
  const START = 100;
  const END = 181; // Need up to 180
  
  console.log(`Building tables for positions ${START}-${END-1}...`);
  console.log('This will take several minutes. Progress will be shown.\n');
  
  let output = '';
  
  for (let pos = START; pos < END; pos++) {
    const table = await buildTable(pos);
    const count = Object.keys(table).length;
    console.log(`Position ${pos}: ${count} entries`);
    
    const entries = Object.entries(table)
      .map(([char, byte]) => {
        const escapedChar = char === "'" ? "\\'" : char === '\\' ? '\\\\' : char;
        return `'${escapedChar}':0x${byte.toString(16).padStart(2, '0')}`;
      })
      .join(',');
    output += `  ${pos}: {${entries}},\n`;
    
    // Save progress after each position
    fs.writeFileSync('tables-100-180.txt', output);
  }
  
  console.log('\n✓ Done! Tables saved to tables-100-180.txt');
  console.log('Next: Run "node scripts/update-crypto.js" to add tables to animekai-crypto.ts');
}

main().catch(console.error);
