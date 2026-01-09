// Extract the full 1movies API hash from the obfuscated code
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function extractHash() {
  console.log('Extracting 1movies API hash...\n');
  
  // Fetch the 860 chunk
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const res = await fetch(chunkUrl);
  const js = await res.text();
  
  // From the context, we can see the hash is built from multiple parts
  // The visible parts are: "0363-4e1b-5482-8d76-" and "88bf9898b9" and "913b00773/ar"
  
  // Let's find the full context around the m variable assignment
  const mIdx = js.indexOf('e3.current=m');
  if (mIdx > -1) {
    // Go back to find where m is defined
    const context = js.substring(Math.max(0, mIdx - 3000), mIdx + 100);
    
    // Look for the m= assignment
    const mAssignIdx = context.lastIndexOf('m=');
    if (mAssignIdx > -1) {
      const mAssign = context.substring(mAssignIdx, mAssignIdx + 1500);
      console.log('m assignment context:');
      console.log(mAssign.substring(0, 800));
      
      // Extract all the string literals from this context
      const stringLiterals = mAssign.match(/"[^"]+"/g) || [];
      console.log('\nString literals in m assignment:');
      stringLiterals.forEach(s => console.log('  ', s));
      
      // The hash parts we can see directly:
      // "0363-4e1b-5482-8d76-"
      // "88bf9898b9"
      // "913b00773/ar"
      
      // Let's try to reconstruct the hash
      // The pattern seems to be a UUID-like structure
    }
  }
  
  // Let's also look for the full hash by searching for patterns
  console.log('\n=== Searching for hash patterns ===');
  
  // Look for strings that look like parts of a hash
  const hashParts = [];
  
  // Find all hex-like strings
  const hexStrings = js.match(/"[a-f0-9]{4,}"/gi) || [];
  console.log('Hex strings found:', hexStrings.length);
  hexStrings.slice(0, 30).forEach(s => console.log('  ', s));
  
  // Look for UUID-like patterns
  const uuidPatterns = js.match(/"[a-f0-9]{4}-[a-f0-9]{4}[^"]*"/gi) || [];
  console.log('\nUUID-like patterns:', uuidPatterns);
  
  // Now let's try to find the actual API endpoint by looking at what's after /ar
  console.log('\n=== Looking for endpoint suffix ===');
  
  // The context showed "913b00773/ar" - so the endpoint might be /ar not /sr
  const arIdx = js.indexOf('913b00773/ar');
  if (arIdx > -1) {
    const arContext = js.substring(Math.max(0, arIdx - 500), arIdx + 100);
    console.log('Context around /ar:');
    console.log(arContext);
  }
  
  // Let's try to manually reconstruct the hash from the visible parts
  console.log('\n=== Attempting hash reconstruction ===');
  
  // From the context, the hash seems to be built like:
  // r(392,-33)+r(409,-34)+t(1184,1222,1178,1176)+r(381,-150)+r(344,-129)+r(364,-148)+r(413,-112)+r(362,-121)
  // + more parts
  // + "0363-4e1b-5482-8d76-"
  // + more parts
  // + "88bf9898b9"
  // + more parts
  // + "913b00773/ar"
  
  // The visible string parts suggest the hash might be:
  // Something like: xxxx0363-4e1b-5482-8d76-xxxx88bf9898b9xxxx913b00773
  // And the endpoint is /ar
  
  // Let's try to find more string literals around these patterns
  const idx1 = js.indexOf('0363-4e1b-5482-8d76');
  if (idx1 > -1) {
    const ctx1 = js.substring(Math.max(0, idx1 - 200), idx1 + 200);
    console.log('Context around 0363-4e1b-5482-8d76:');
    console.log(ctx1);
  }
  
  const idx2 = js.indexOf('88bf9898b9');
  if (idx2 > -1) {
    const ctx2 = js.substring(Math.max(0, idx2 - 200), idx2 + 200);
    console.log('\nContext around 88bf9898b9:');
    console.log(ctx2);
  }
  
  // Let's try the API with the reconstructed hash
  console.log('\n=== Testing reconstructed hashes ===');
  
  // Get pageData
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await pageRes.text();
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  // Try different hash patterns
  const testHashes = [
    // Based on visible parts, try to guess the full hash
    '0363-4e1b-5482-8d76-88bf9898b9913b00773',
    '03634e1b54828d7688bf9898b9913b00773',
  ];
  
  for (const hash of testHashes) {
    // Try /ar endpoint
    const url = `${BASE_URL}/${hash}/${pageData}/ar`;
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
      console.log(`${hash}/ar: ${testRes.status}`);
      if (testRes.ok) {
        const text = await testRes.text();
        console.log('  Response:', text.substring(0, 200));
      }
    } catch (e) {
      console.log(`${hash}/ar: Error`);
    }
  }
}

extractHash().catch(console.error);
