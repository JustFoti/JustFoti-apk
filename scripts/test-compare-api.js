/**
 * Compare our encryption with enc-dec.app API
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
  const { encryptAnimeKai } = await import('../app/lib/animekai-crypto.ts');
  
  const testCases = ['c4S88Q', 'test', 'abc123'];
  
  for (const input of testCases) {
    console.log(`\n=== Testing: "${input}" ===`);
    
    // Our encryption
    const ourResult = encryptAnimeKai(input);
    console.log(`Our encryption: ${ourResult}`);
    
    // enc-dec.app API encryption (correct endpoint)
    try {
      const encDecUrl = `https://enc-dec.app/api/enc-kai?text=${encodeURIComponent(input)}`;
      const response = await fetchJson(encDecUrl);
      console.log(`API status: ${response.status}`);
      
      if (response.data?.result) {
        console.log(`enc-dec.app:    ${response.data.result}`);
        console.log(`Match: ${ourResult === response.data.result ? '✓ YES' : '✗ NO'}`);
        
        if (ourResult !== response.data.result) {
          // Compare byte by byte
          const ourBytes = Buffer.from(ourResult.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64');
          const apiBytes = Buffer.from(response.data.result.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64');
          
          console.log(`\nOur bytes (${ourBytes.length}):  ${Array.from(ourBytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
          console.log(`API bytes (${apiBytes.length}): ${Array.from(apiBytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
          
          // Find differences
          const maxLen = Math.max(ourBytes.length, apiBytes.length);
          const diffs = [];
          for (let i = 0; i < maxLen; i++) {
            if (ourBytes[i] !== apiBytes[i]) {
              diffs.push(`pos ${i}: ours=0x${(ourBytes[i] || 0).toString(16).padStart(2, '0')} api=0x${(apiBytes[i] || 0).toString(16).padStart(2, '0')}`);
            }
          }
          if (diffs.length > 0) {
            console.log(`Differences: ${diffs.join(', ')}`);
          }
        }
      } else {
        console.log(`API response: ${JSON.stringify(response.data).substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`enc-dec.app error: ${e.message}`);
    }
  }
}

main().catch(console.error);
