/**
 * Build full table 181
 */
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ error: data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const baseStr = 'x'.repeat(182);  // For table 182
  const chars = '0123456789 !"#$%&\'()*+,-./:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
  const table = {};
  
  console.log('Building table 181...');
  
  for (const char of chars) {
    const testStr = baseStr + char;
    const url = `https://enc-dec.app/api/enc-kai?text=${encodeURIComponent(testStr)}`;
    
    try {
      const response = await fetchJson(url);
      if (response.result) {
        const base64 = response.result.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        const buffer = Buffer.from(padded, 'base64');
        const byte = buffer[216];  // Position 182 is at actual position 216
        table[char] = byte;
        process.stdout.write('.');
      }
    } catch (e) {
      process.stdout.write('x');
    }
    await new Promise(r => setTimeout(r, 30));
  }
  
  console.log('\n\nTable 181:');
  const entries = Object.entries(table)
    .filter(([, byte]) => byte !== undefined)
    .map(([char, byte]) => {
      let escapedChar = char;
      if (char === "'") escapedChar = "\\'";
      else if (char === "\\") escapedChar = "\\\\";
      return `'${escapedChar}':0x${byte.toString(16).padStart(2, '0')}`;
    }).join(',');
  console.log(`  182: {${entries}},`);
}

main();
