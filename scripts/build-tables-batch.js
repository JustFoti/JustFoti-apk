/**
 * Build substitution tables in smaller batches
 * Run with: node scripts/build-tables-batch.js <start> <end>
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
    } catch (e) {}
  }
  return table;
}

async function main() {
  const start = parseInt(process.argv[2]) || 20;
  const end = parseInt(process.argv[3]) || 30;
  
  console.log(`Building tables for positions ${start}-${end-1}...`);
  
  const tables = {};
  
  for (let pos = start; pos < end; pos++) {
    tables[pos] = await buildTable(pos);
    console.log(`Position ${pos}: ${Object.keys(tables[pos]).length} entries`);
  }
  
  // Output as JavaScript
  console.log('\n// Tables for positions ' + start + '-' + (end-1));
  for (let pos = start; pos < end; pos++) {
    const entries = Object.entries(tables[pos])
      .map(([char, byte]) => {
        const escapedChar = char === "'" ? "\\'" : char === '\\' ? '\\\\' : char;
        return `'${escapedChar}':0x${byte.toString(16).padStart(2, '0')}`;
      })
      .join(',');
    console.log(`  ${pos}: {${entries}},`);
  }
  
  // Also save to file
  const filename = `tables-${start}-${end-1}.txt`;
  let output = '';
  for (let pos = start; pos < end; pos++) {
    const entries = Object.entries(tables[pos])
      .map(([char, byte]) => {
        const escapedChar = char === "'" ? "\\'" : char === '\\' ? '\\\\' : char;
        return `'${escapedChar}':0x${byte.toString(16).padStart(2, '0')}`;
      })
      .join(',');
    output += `  ${pos}: {${entries}},\n`;
  }
  fs.writeFileSync(filename, output);
  console.log(`\nSaved to ${filename}`);
}

main().catch(console.error);
