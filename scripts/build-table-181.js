/**
 * Build table 181 using enc-dec.app API
 */
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data, error: 'parse error' });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Building Table 181 ===\n');
  
  const chars = '0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  const table181 = {};
  const baseStr = 'x'.repeat(181);
  
  console.log('Testing characters at position 181...');
  
  for (const char of chars) {
    const testStr = baseStr + char;
    
    try {
      const url = `https://enc-dec.app/api/enc-kai?text=${encodeURIComponent(testStr)}`;
      const response = await fetchJson(url);
      
      if (response.data?.result) {
        const base64 = response.data.result.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        const buffer = Buffer.from(padded, 'base64');
        const byte = buffer[215];
        table181[char] = byte;
        console.log(`  '${char}' -> 0x${byte.toString(16).padStart(2, '0')}`);
      }
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      console.log(`  '${char}' -> ERROR: ${e.message}`);
    }
  }
  
  console.log('\n=== Table 181 ===');
  const entries = Object.entries(table181).map(([char, byte]) => {
    let escapedChar = char;
    if (char === "'") escapedChar = "\\'";
    else if (char === "\\") escapedChar = "\\\\";
    return `'${escapedChar}':0x${byte.toString(16).padStart(2, '0')}`;
  }).join(',');
  console.log(`181: {${entries}},`);
}

main().catch(console.error);
