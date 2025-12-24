/**
 * Compare our encryption with enc-dec.app
 */
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function main() {
  const { encryptAnimeKai } = await import('../app/lib/animekai-crypto.ts');
  
  const testCases = ['c4S88Q', 'test', 'abc123', 'XyZ'];
  
  for (const input of testCases) {
    console.log(`\n=== Testing: "${input}" ===`);
    
    // Our encryption
    const ourResult = encryptAnimeKai(input);
    console.log(`Our encryption: ${ourResult}`);
    
    // enc-dec.app encryption
    try {
      const encDecUrl = `https://enc-dec.app/enc-kai?text=${encodeURIComponent(input)}`;
      const response = await fetchUrl(encDecUrl);
      console.log(`enc-dec.app:    ${response.data}`);
      console.log(`Match: ${ourResult === response.data ? '✓ YES' : '✗ NO'}`);
    } catch (e) {
      console.log(`enc-dec.app error: ${e.message}`);
    }
  }
}

main().catch(console.error);
