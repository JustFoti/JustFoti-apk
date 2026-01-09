// Extract only the LITERAL parts of the 1movies API hash
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function extractLiterals() {
  console.log('Extracting 1movies API hash from literals...\n');
  
  // The literal parts we found in the code:
  // "pTGy82DLIz"
  // "pliKjWPhvP"  
  // "0363-4e1b-5482-8d76-"
  // "4b/e993fc0bc499fdfb502f96b8596"
  // "88bf9898b9"
  // "913b00773/ar"
  
  // And from decoded strings that look like hash parts:
  // "ec6fdebe97"
  // "d30afdf5f7"
  // "0ad4d3e108"
  // "IzDjFmHp4z"
  // "68GVQ5AVke"
  // "aUmlRlblS_"
  // "l8s1r/ef86"
  // "1GLf2TIhby"
  // "jw4CVCy8jn"
  
  // The endpoint is /ar (from "913b00773/ar")
  // So the hash ends with "913b00773"
  
  // Let me try to reconstruct by looking at what makes sense
  // A typical API hash is 64 hex chars or a UUID-like structure
  
  // From the context, the hash structure seems to be:
  // [decoded parts] + "pTGy82DLIz" + [decoded parts] + "pliKjWPhvP" + [decoded parts] + "0363-4e1b-5482-8d76-" + [decoded parts] + "4b/e993fc0bc499fdfb502f96b8596" + [decoded parts] + "88bf9898b9" + [decoded parts] + "913b00773"
  
  // Wait - "4b/e993fc0bc499fdfb502f96b8596" contains a "/" which suggests it's part of the path!
  // So the structure might be: HASH/e993fc0bc499fdfb502f96b8596.../ar
  
  // Let me look at this more carefully
  // The fetch URL is: "/" + m + "/" + p + r(368,-104)
  // Where m is the hash, p is the encoded pageData, and r(368,-104) is the endpoint
  
  // r(368,-104) with offset 338 = index 30 = "href" - that's wrong
  // But wait, r(360,-94) = index 22 = "/sr"
  
  // So the endpoint might be /sr not /ar!
  
  // Let me try different combinations
  console.log('=== Testing different hash combinations ===\n');
  
  // Get pageData
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await pageRes.text();
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('pageData:', pageData);
  
  // The literal hash parts that look like actual hash components:
  const hashCandidates = [
    // Just the hex-looking parts
    'ec6fdebe97d30afdf5f70ad4d3e108pTGy82DLIzpliKjWPhvP0363-4e1b-5482-8d76-4be993fc0bc499fdfb502f96b859688bf9898b9913b00773',
    // Without the UUID-like part
    'ec6fdebe97d30afdf5f70ad4d3e108pTGy82DLIzpliKjWPhvP4be993fc0bc499fdfb502f96b859688bf9898b9913b00773',
    // Just hex parts
    'ec6fdebe97d30afdf5f70ad4d3e1084be993fc0bc499fdfb502f96b859688bf9898b9913b00773',
  ];
  
  const endpoints = ['/sr', '/ar', '/sources'];
  
  for (const hash of hashCandidates) {
    for (const endpoint of endpoints) {
      const url = `${BASE_URL}/${hash}/${pageData}${endpoint}`;
      try {
        const testRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `${BASE_URL}/movie/550`,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/octet-stream',
          }
        });
        console.log(`${hash.substring(0, 30)}...${endpoint}: ${testRes.status}`);
        if (testRes.ok) {
          const text = await testRes.text();
          console.log('  Response:', text.substring(0, 200));
        }
      } catch (e) {
        console.log(`${hash.substring(0, 30)}...${endpoint}: Error`);
      }
    }
  }
  
  // Let me also try to find the hash by looking at what the old hash looked like
  // Old hash: fcd552c4321aeac1e62c5304913b3420be75a19d390807281a425aabbb5dc4c0
  // This is 64 hex chars
  
  // The new hash might follow a similar pattern
  // Let me search for 64-char patterns in the decoded strings
  
  console.log('\n=== Looking for 64-char hash ===');
  
  // Fetch the 860 chunk again
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const res = await fetch(chunkUrl);
  const js = await res.text();
  
  // Look for any 64-char hex string
  const hex64 = js.match(/[a-f0-9]{64}/gi) || [];
  console.log('64-char hex strings:', hex64);
  
  // Look for the pattern around the fetch call more carefully
  const fetchIdx = js.indexOf('fetch("/"+m+"/"+p');
  if (fetchIdx > -1) {
    // Get a larger context
    const context = js.substring(Math.max(0, fetchIdx - 5000), fetchIdx + 500);
    
    // Look for all string literals in this context
    const literals = context.match(/"[^"]+"/g) || [];
    console.log('\nLiterals near fetch:');
    literals.forEach(l => {
      // Only show ones that look like hash parts
      if (l.length > 5 && !l.includes('function') && !l.includes('return') && !l.includes('Content')) {
        console.log(' ', l);
      }
    });
  }
}

extractLiterals().catch(console.error);
