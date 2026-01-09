// Crack 1movies API - v2
// The API uses obfuscated strings that need to be decoded
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function crack1movies() {
  console.log('Cracking 1movies API v2...\n');
  
  // Fetch the 860 chunk which contains the API logic
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  console.log('Fetching chunk:', chunkUrl);
  
  const res = await fetch(chunkUrl);
  const js = await res.text();
  console.log('Chunk size:', js.length, 'bytes\n');
  
  // The chunk uses string obfuscation with a lookup array
  // Let's find and decode the string array
  
  // Find the string array at the start
  const arrayMatch = js.match(/var\s+(\w+)\s*=\s*\[([^\]]+)\]/);
  if (arrayMatch) {
    console.log('Found string array variable:', arrayMatch[1]);
    
    // Parse the array
    const arrayContent = arrayMatch[2];
    const strings = arrayContent.match(/"[^"]+"/g) || [];
    console.log('String count:', strings.length);
    console.log('First 20 strings:', strings.slice(0, 20).map(s => s.replace(/"/g, '')));
  }
  
  // Look for the decoder function pattern
  // Usually: function(e, t) { return array[e - offset] }
  console.log('\n=== Looking for decoder function ===');
  
  const decoderMatch = js.match(/function\s+(\w+)\s*\(\s*\w+\s*,\s*\w+\s*\)\s*\{\s*(?:var\s+\w+\s*=\s*)?(\w+)\s*\(\s*\)/);
  if (decoderMatch) {
    console.log('Found decoder function:', decoderMatch[1]);
  }
  
  // The key insight from the previous analysis:
  // The fetch URL is: fetch("/"+m+"/"+p+r(368,-104), ...)
  // Where m is the API hash and p is the encoded pageData
  // r(368,-104) decodes to something like "/sr" or "/sources"
  
  // Let's find the actual values by looking at the context
  console.log('\n=== Analyzing fetch context ===');
  
  const fetchContext = js.substring(
    js.indexOf('fetch("/"+m+"/"+p') - 2000,
    js.indexOf('fetch("/"+m+"/"+p') + 500
  );
  
  // Look for the m variable assignment
  // From context: m=r(392,-33)+r(409,-34)+...
  const mAssignMatch = fetchContext.match(/m\s*=\s*([^,;]+(?:\+[^,;]+)*)/);
  if (mAssignMatch) {
    console.log('m assignment:', mAssignMatch[1].substring(0, 200));
  }
  
  // The r() function is the decoder
  // Let's try to find the string array and decode manually
  
  console.log('\n=== Attempting manual decode ===');
  
  // Find all string literals in the chunk
  const allStrings = js.match(/"[^"]{2,}"/g) || [];
  const uniqueStrings = [...new Set(allStrings)].map(s => s.replace(/"/g, ''));
  
  // Look for strings that look like API hash parts
  const hashLikeStrings = uniqueStrings.filter(s => 
    /^[a-f0-9]{4,}$/i.test(s) || 
    /^[a-f0-9]{4}-[a-f0-9]{4}$/i.test(s) ||
    s.length === 64
  );
  console.log('Hash-like strings:', hashLikeStrings);
  
  // Look for strings that look like endpoints
  const endpointStrings = uniqueStrings.filter(s => 
    s.startsWith('/') || 
    s === 'sr' || 
    s === 'sources' ||
    s.includes('api')
  );
  console.log('Endpoint-like strings:', endpointStrings.slice(0, 20));
  
  // Now let's try to intercept the actual API call by using the browser
  // We can do this by fetching the page and looking at the network requests
  
  console.log('\n=== Testing API patterns ===');
  
  // Get pageData first
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await pageRes.text();
  
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('pageData:', pageData);
  
  // The old API hash was: fcd552c4321aeac1e62c5304913b3420be75a19d390807281a425aabbb5dc4c0
  // Let's try variations
  
  // From the context, we saw: "0363-4e1b-5482-8d76-" which looks like a UUID part
  // Let's try to find the full hash by looking at the concatenation pattern
  
  // The pattern was: r(392,-33)+r(409,-34)+t(1184,1222,1178,1176)+...
  // This suggests the hash is built from multiple decoded strings
  
  // Let's try to find strings that when concatenated form a 64-char hex hash
  const hexStrings = uniqueStrings.filter(s => /^[a-f0-9]+$/i.test(s) && s.length >= 4);
  console.log('\nHex strings found:', hexStrings);
  
  // Try to find the API by looking at what endpoints exist
  console.log('\n=== Testing known endpoints ===');
  
  const endpoints = [
    `/${pageData}/sr`,
    `/${pageData}/sources`,
    `/api/sources/${pageData}`,
    `/api/stream/${pageData}`,
  ];
  
  for (const endpoint of endpoints) {
    try {
      const testRes = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `${BASE_URL}/movie/550`,
          'X-Requested-With': 'XMLHttpRequest',
        }
      });
      console.log(`${endpoint}: ${testRes.status}`);
      if (testRes.ok) {
        const text = await testRes.text();
        console.log('  Response:', text.substring(0, 200));
      }
    } catch (e) {
      console.log(`${endpoint}: Error`);
    }
  }
  
  // Let's try to find the actual API by looking at the buildId
  const buildId = nextData.buildId;
  console.log('\nBuild ID:', buildId);
  
  // Try the _next/data endpoint
  const dataEndpoint = `/_next/data/${buildId}/movie/550.json`;
  console.log('\nTrying _next/data endpoint:', dataEndpoint);
  
  const dataRes = await fetch(`${BASE_URL}${dataEndpoint}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': `${BASE_URL}/movie/550`,
    }
  });
  console.log('Status:', dataRes.status);
  if (dataRes.ok) {
    const data = await dataRes.json();
    console.log('Data keys:', Object.keys(data));
    if (data.pageProps) {
      console.log('pageProps keys:', Object.keys(data.pageProps));
    }
  }
}

crack1movies().catch(console.error);
