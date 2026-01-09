// Simulate 1movies browser behavior
// The site uses obfuscated JS, but we can try to understand the pattern
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function simulate() {
  console.log('Simulating 1movies browser behavior...\n');
  
  // Step 1: Get the page and extract pageData
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  const html = await pageRes.text();
  
  // Get cookies
  const cookies = pageRes.headers.get('set-cookie');
  console.log('Cookies:', cookies?.substring(0, 100) || 'none');
  
  // Extract pageData
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('pageData:', pageData);
  console.log('pageData length:', pageData.length);
  
  // The pageData is already encoded - it's the "p" in the fetch URL
  // We need to find "m" (the API hash)
  
  // From the code analysis:
  // - The token "IWllVsuBx0Iy" is used in a header
  // - The URL is: /{m}/{p}/sr
  // - m is built from multiple decoded strings
  
  // Let's try to find m by looking at what the old hash looked like
  // Old hash: fcd552c4321aeac1e62c5304913b3420be75a19d390807281a425aabbb5dc4c0
  
  // The new hash might be similar - let's try to find it in the chunks
  console.log('\n=== Searching for API hash in all chunks ===');
  
  // Get the list of chunks from the page
  const chunkMatches = html.match(/_next\/static\/chunks\/[^"']+\.js/g) || [];
  console.log('Chunks found:', chunkMatches.length);
  
  for (const chunk of chunkMatches) {
    const chunkUrl = `${BASE_URL}/${chunk}`;
    try {
      const chunkRes = await fetch(chunkUrl);
      const js = await chunkRes.text();
      
      // Look for 64-char hex strings
      const hexMatches = js.match(/["'][a-f0-9]{64}["']/gi) || [];
      if (hexMatches.length > 0) {
        console.log(`\n${chunk}:`);
        console.log('  Found hex:', hexMatches);
      }
      
      // Look for the specific pattern from the context
      // The hash is built from: "0363-4e1b-5482-8d76-" + more parts
      if (js.includes('0363-4e1b-5482-8d76')) {
        console.log(`\n${chunk}: Contains UUID pattern!`);
      }
      
      // Look for the token
      if (js.includes('IWllVsuBx0Iy')) {
        console.log(`\n${chunk}: Contains token!`);
        
        // Extract context around the token
        const tokenIdx = js.indexOf('IWllVsuBx0Iy');
        const context = js.substring(Math.max(0, tokenIdx - 500), tokenIdx + 100);
        console.log('Context:', context.substring(context.length - 300));
      }
    } catch (e) {
      // Skip failed chunks
    }
  }
  
  // Let's also try to understand the encoding of pageData
  console.log('\n=== Analyzing pageData encoding ===');
  
  // The pageData looks like base64url but with custom alphabet
  // Let's see if we can decode it
  
  // Try standard base64url decode
  try {
    let b64 = pageData.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    console.log('Base64url decode:', decoded.substring(0, 100));
  } catch (e) {
    console.log('Base64url decode failed');
  }
  
  // The pageData might be the result of:
  // AES encrypt → hex → XOR → base64 → char substitution
  // We need to reverse this
  
  // Let's try to find the substitution alphabet
  console.log('\n=== Looking for alphabet substitution ===');
  
  // Standard base64url alphabet: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_
  // The shuffled alphabet from our extractor: TuzHOxl7b0RW9o_1FPV3eGfmL4Z5pD8cahBQr2U-6yvEYwngXCdJjANtqKIMiSks
  
  // Let's try to reverse the substitution
  const STANDARD = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  const SHUFFLED = "TuzHOxl7b0RW9o_1FPV3eGfmL4Z5pD8cahBQr2U-6yvEYwngXCdJjANtqKIMiSks";
  
  // Build reverse map
  const reverseMap = new Map();
  for (let i = 0; i < SHUFFLED.length; i++) {
    reverseMap.set(SHUFFLED[i], STANDARD[i]);
  }
  
  // Try to reverse the substitution
  let reversed = '';
  for (const char of pageData) {
    reversed += reverseMap.get(char) || char;
  }
  console.log('Reversed substitution:', reversed.substring(0, 100));
  
  // Now try base64 decode on the reversed string
  try {
    let b64 = reversed.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    console.log('After base64 decode:', decoded.substring(0, 100));
  } catch (e) {
    console.log('Base64 decode failed:', e.message);
  }
  
  // Let's try the API with different hash patterns
  console.log('\n=== Testing API with different hashes ===');
  
  // The old hash was: fcd552c4321aeac1e62c5304913b3420be75a19d390807281a425aabbb5dc4c0
  // Let's try variations
  
  const testHashes = [
    'fcd552c4321aeac1e62c5304913b3420be75a19d390807281a425aabbb5dc4c0', // old
    '0363-4e1b-5482-8d76', // UUID part from context
  ];
  
  for (const hash of testHashes) {
    const url = `${BASE_URL}/${hash}/${pageData}/sr`;
    try {
      const testRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `${BASE_URL}/movie/550`,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/octet-stream',
          'X-Token': 'IWllVsuBx0Iy',
        }
      });
      console.log(`${hash.substring(0, 20)}...: ${testRes.status}`);
    } catch (e) {
      console.log(`${hash.substring(0, 20)}...: Error`);
    }
  }
}

simulate().catch(console.error);
