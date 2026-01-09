// Crack 1movies API by analyzing the actual page and JS chunks
require('dotenv').config({ path: '.env.local' });

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function crack1movies() {
  console.log('=== Cracking 1movies API ===\n');
  
  // Step 1: Fetch the movie page
  console.log('1. Fetching movie page...');
  const pageRes = await fetch('https://111movies.com/movie/550', { headers: HEADERS });
  const pageHtml = await pageRes.text();
  
  // Extract __NEXT_DATA__
  const nextDataMatch = pageHtml.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!nextDataMatch) {
    console.log('ERROR: Could not find __NEXT_DATA__');
    return;
  }
  
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  console.log('   pageData:', pageData?.substring(0, 80) + '...');
  
  // Find all JS chunk URLs
  const chunkMatches = pageHtml.matchAll(/\/_next\/static\/chunks\/([^"]+\.js)/g);
  const chunks = [...chunkMatches].map(m => m[1]);
  console.log(`\n2. Found ${chunks.length} JS chunks`);
  
  // Step 2: Find the chunk with the API hash
  console.log('\n3. Searching for API hash in chunks...');
  
  // Look for chunks that might contain the API logic
  const interestingChunks = chunks.filter(c => 
    c.includes('860') || c.includes('app') || c.match(/^\d+-[a-f0-9]+\.js$/)
  );
  
  console.log('   Interesting chunks:', interestingChunks.slice(0, 10));
  
  // Fetch and analyze each interesting chunk
  for (const chunk of interestingChunks.slice(0, 15)) {
    const chunkUrl = `https://111movies.com/_next/static/chunks/${chunk}`;
    const chunkRes = await fetch(chunkUrl, { headers: HEADERS });
    const chunkCode = await chunkRes.text();
    
    // Look for fetch patterns with hash-like strings
    const fetchMatches = chunkCode.matchAll(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/g);
    for (const m of fetchMatches) {
      if (m[1].includes('/') && m[1].length > 20) {
        console.log(`   [${chunk}] fetch: ${m[1].substring(0, 100)}`);
      }
    }
    
    // Look for long hex strings (potential API hashes)
    const hexMatches = chunkCode.matchAll(/["']([a-f0-9]{40,80})["']/g);
    for (const m of hexMatches) {
      console.log(`   [${chunk}] hex: ${m[1]}`);
    }
    
    // Look for API endpoint patterns
    if (chunkCode.includes('/sr') || chunkCode.includes('/ar')) {
      console.log(`   [${chunk}] Contains /sr or /ar endpoint!`);
      
      // Extract surrounding context
      const srIndex = chunkCode.indexOf('/sr');
      const arIndex = chunkCode.indexOf('/ar');
      
      if (srIndex > 0) {
        console.log(`   /sr context: ...${chunkCode.substring(Math.max(0, srIndex - 100), srIndex + 50)}...`);
      }
      if (arIndex > 0) {
        console.log(`   /ar context: ...${chunkCode.substring(Math.max(0, arIndex - 100), arIndex + 50)}...`);
      }
    }
    
    // Look for X-Token or similar headers
    if (chunkCode.includes('X-Token') || chunkCode.includes('x-token')) {
      console.log(`   [${chunk}] Contains X-Token header!`);
      const tokenMatch = chunkCode.match(/["']X-Token["']\s*:\s*["']([^"']+)["']/i);
      if (tokenMatch) {
        console.log(`   Token value: ${tokenMatch[1]}`);
      }
    }
  }
  
  // Step 3: Try to find the main app chunk
  console.log('\n4. Looking for main app chunk...');
  const appChunks = chunks.filter(c => c.includes('app') || c.includes('main') || c.includes('page'));
  console.log('   App chunks:', appChunks);
  
  // Step 4: Try common API patterns
  console.log('\n5. Testing API patterns...');
  
  // Try the old hash first
  const oldHash = 'fcd552c4321aeac1e62c5304913b3420be75a19d390807281a425aabbb5dc4c0';
  
  // Try fetching sources with different endpoints
  const testEndpoints = ['/sr', '/ar', '/sources', '/stream'];
  
  for (const endpoint of testEndpoints) {
    const testUrl = `https://111movies.com/${oldHash}/test${endpoint}`;
    try {
      const res = await fetch(testUrl, { 
        headers: { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest' }
      });
      console.log(`   ${endpoint}: ${res.status}`);
    } catch (e) {
      console.log(`   ${endpoint}: error`);
    }
  }
  
  // Step 5: Look for the buildId and try to find the API route
  console.log('\n6. Checking Next.js build info...');
  console.log('   buildId:', nextData.buildId);
  
  // Try to find API routes
  const apiRouteRes = await fetch(`https://111movies.com/api/sources`, { 
    headers: HEADERS,
    method: 'POST',
    body: JSON.stringify({ data: pageData })
  }).catch(() => null);
  
  if (apiRouteRes) {
    console.log('   /api/sources:', apiRouteRes.status);
    if (apiRouteRes.ok) {
      const body = await apiRouteRes.text();
      console.log('   Response:', body.substring(0, 200));
    }
  }
}

crack1movies().catch(console.error);
