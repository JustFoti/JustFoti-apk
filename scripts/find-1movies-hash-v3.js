// Find the current 1movies API hash
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function findApiHash() {
  console.log('Finding 1movies API hash...\n');
  
  // Step 1: Fetch the main page
  const pageUrl = `${BASE_URL}/movie/550`;
  console.log('1. Fetching page:', pageUrl);
  
  const pageRes = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const html = await pageRes.text();
  console.log('   HTML length:', html.length);
  
  // Step 2: Find ALL script bundles
  const scriptMatches = html.match(/<script[^>]*src="([^"]+\.js)"[^>]*>/g) || [];
  console.log('\n2. Found', scriptMatches.length, 'script tags');
  
  const scriptUrls = scriptMatches.map(s => {
    const match = s.match(/src="([^"]+)"/);
    return match ? match[1] : null;
  }).filter(Boolean);
  
  // Step 3: Check each bundle for API patterns
  console.log('\n3. Checking bundles for API hash...');
  
  const allHashes = new Set();
  const apiPatterns = [];
  
  for (const scriptPath of scriptUrls) {
    const scriptUrl = scriptPath.startsWith('http') ? scriptPath : `${BASE_URL}${scriptPath}`;
    
    try {
      const res = await fetch(scriptUrl);
      const js = await res.text();
      
      // Find 64-char hex strings
      const hashes = js.match(/[a-f0-9]{64}/g) || [];
      hashes.forEach(h => allHashes.add(h));
      
      // Find API route patterns like /${hash}/
      const routes = js.match(/\/[a-f0-9]{64}\//g) || [];
      routes.forEach(r => apiPatterns.push({ route: r, file: scriptPath }));
      
      // Look for specific patterns
      if (js.includes('/sr') || js.includes('sources')) {
        console.log('   Found sources pattern in:', scriptPath.split('/').pop());
        
        // Look for the API hash near /sr
        const srContext = js.match(/.{0,100}\/sr.{0,100}/g);
        if (srContext) {
          console.log('   Context:', srContext[0]?.substring(0, 80));
        }
      }
      
    } catch (e) {
      // Skip failed fetches
    }
  }
  
  console.log('\n4. Results:');
  console.log('   Unique hashes found:', allHashes.size);
  console.log('   API route patterns:', apiPatterns.length);
  
  if (allHashes.size > 0) {
    console.log('\n   Hashes:');
    [...allHashes].forEach(h => console.log('   -', h));
  }
  
  if (apiPatterns.length > 0) {
    console.log('\n   API patterns:');
    apiPatterns.forEach(p => console.log('   -', p.route, 'in', p.file.split('/').pop()));
  }
  
  // Step 4: Look for the hash in inline scripts
  console.log('\n5. Checking inline scripts...');
  const inlineScripts = html.match(/<script[^>]*>([^<]{100,})<\/script>/g) || [];
  console.log('   Found', inlineScripts.length, 'inline scripts');
  
  for (const script of inlineScripts) {
    const hashes = script.match(/[a-f0-9]{64}/g) || [];
    if (hashes.length > 0) {
      console.log('   Found hashes in inline script:', hashes);
    }
  }
  
  // Step 5: Check __NEXT_DATA__ for any API info
  console.log('\n6. Checking __NEXT_DATA__...');
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (nextDataMatch) {
    const nextData = JSON.parse(nextDataMatch[1]);
    console.log('   buildId:', nextData.buildId);
    console.log('   runtimeConfig:', nextData.runtimeConfig ? 'present' : 'none');
    
    // Check for API URL in runtime config
    if (nextData.runtimeConfig) {
      console.log('   Runtime config:', JSON.stringify(nextData.runtimeConfig).substring(0, 200));
    }
  }
  
  // Step 6: Try to find the hash by looking at network patterns
  console.log('\n7. Looking for API endpoint patterns in JS...');
  
  // Fetch the main chunks
  const chunkMatches = html.match(/_next\/static\/chunks\/[^"]+\.js/g) || [];
  console.log('   Found', chunkMatches.length, 'chunk files');
  
  for (const chunk of chunkMatches.slice(0, 10)) {
    const chunkUrl = `${BASE_URL}/${chunk}`;
    try {
      const res = await fetch(chunkUrl);
      const js = await res.text();
      
      // Look for fetch patterns with the hash
      const fetchPatterns = js.match(/fetch\s*\(\s*["'`][^"'`]*[a-f0-9]{64}[^"'`]*["'`]/g) || [];
      if (fetchPatterns.length > 0) {
        console.log('   Found fetch pattern in', chunk.split('/').pop());
        fetchPatterns.forEach(p => console.log('     ', p.substring(0, 80)));
      }
      
      // Look for concat patterns that build the URL
      const concatPatterns = js.match(/concat\s*\(\s*["'][a-f0-9]{64}["']/g) || [];
      if (concatPatterns.length > 0) {
        console.log('   Found concat pattern in', chunk.split('/').pop());
        concatPatterns.forEach(p => console.log('     ', p));
      }
      
    } catch (e) {
      // Skip
    }
  }
}

findApiHash().catch(console.error);
