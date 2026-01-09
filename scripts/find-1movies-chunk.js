// Find 1movies API hash in movie chunk
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function findInChunk() {
  console.log('Finding 1movies API hash in movie chunk...\n');
  
  // Fetch the movie chunk directly
  const chunkUrl = `${BASE_URL}/_next/static/chunks/pages/movie/[id]-514a645fd1cf49e1.js`;
  console.log('Fetching:', chunkUrl);
  
  const response = await fetch(chunkUrl);
  const js = await response.text();
  console.log('Chunk size:', js.length, 'bytes\n');
  
  // Look for 64-char hex strings that aren't crypto constants
  const hexMatches = js.match(/[a-f0-9]{64}/g) || [];
  const uniqueHashes = [...new Set(hexMatches)].filter(h => 
    !h.includes('ffffffff') && 
    !h.startsWith('0000') &&
    !h.endsWith('0000')
  );
  
  console.log('Found', uniqueHashes.length, 'potential API hashes:');
  uniqueHashes.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
  
  // Look for the specific pattern used in API calls
  console.log('\nLooking for API call patterns...');
  
  // Pattern: fetch("/" + hash + "/")
  const fetchPatterns = js.match(/fetch\s*\([^)]*[a-f0-9]{64}[^)]*\)/gi) || [];
  console.log('Fetch patterns:', fetchPatterns.length);
  fetchPatterns.forEach(p => console.log('  ', p.substring(0, 100)));
  
  // Pattern: "/sr" endpoint
  const srPatterns = js.match(/[^a-z]sr[^a-z]/gi) || [];
  console.log('\n"/sr" patterns:', srPatterns.length);
  
  // Look for the encryption/encoding functions
  console.log('\nLooking for encryption patterns...');
  const cryptoPatterns = js.match(/AES|encrypt|decrypt|cipher|Uint8Array/gi) || [];
  console.log('Crypto keywords:', [...new Set(cryptoPatterns)]);
  
  // Look for base64 patterns
  const base64Patterns = js.match(/btoa|atob|base64/gi) || [];
  console.log('Base64 keywords:', [...new Set(base64Patterns)]);
  
  // Extract a snippet around any hash we find
  if (uniqueHashes.length > 0) {
    console.log('\nContext around first hash:');
    const firstHash = uniqueHashes[0];
    const idx = js.indexOf(firstHash);
    if (idx > -1) {
      const start = Math.max(0, idx - 100);
      const end = Math.min(js.length, idx + firstHash.length + 100);
      console.log('...', js.substring(start, end), '...');
    }
  }
}

findInChunk().catch(console.error);
