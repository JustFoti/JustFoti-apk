// Reverse engineer 1movies API - find how they build URLs
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function reverseApi() {
  console.log('Reverse engineering 1movies API...\n');
  
  // Step 1: Fetch the page
  const pageUrl = `${BASE_URL}/movie/550`;
  console.log('1. Fetching page:', pageUrl);
  
  const pageRes = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const html = await pageRes.text();
  
  // Step 2: Find all JS chunks
  const chunkUrls = [];
  const chunkMatches = html.match(/_next\/static\/chunks\/[^"]+\.js/g) || [];
  chunkMatches.forEach(c => chunkUrls.push(`${BASE_URL}/${c}`));
  
  // Also get pages chunks
  const pageChunks = html.match(/_next\/static\/[^"]+\/pages\/[^"]+\.js/g) || [];
  pageChunks.forEach(c => chunkUrls.push(`${BASE_URL}/${c}`));
  
  console.log('   Found', chunkUrls.length, 'JS files');
  
  // Step 3: Search for API patterns in each chunk
  console.log('\n2. Searching for API patterns...\n');
  
  for (const url of chunkUrls) {
    try {
      const res = await fetch(url);
      const js = await res.text();
      const filename = url.split('/').pop();
      
      // Look for patterns that suggest API URL building
      const patterns = [
        // String concatenation with /sr
        /["'`]\/sr["'`]/g,
        // Fetch calls
        /fetch\s*\([^)]*\)/g,
        // API route patterns
        /["'`]\/[^"'`]*sources[^"'`]*["'`]/g,
        // Encryption/encoding functions
        /encrypt|encode|cipher|aes|crypto/gi,
        // Base64 patterns
        /btoa|atob|base64/gi,
      ];
      
      let found = false;
      
      // Check for /sr endpoint
      if (js.includes('/sr')) {
        console.log(`[${filename}] Contains /sr endpoint`);
        
        // Get context around /sr
        const srIndex = js.indexOf('/sr');
        const context = js.substring(Math.max(0, srIndex - 200), srIndex + 50);
        console.log('   Context:', context.replace(/\s+/g, ' ').substring(0, 150));
        found = true;
      }
      
      // Check for sources endpoint
      if (js.includes('sources') && js.includes('fetch')) {
        const sourcesMatches = js.match(/.{0,100}sources.{0,100}/g) || [];
        if (sourcesMatches.length > 0) {
          console.log(`[${filename}] Contains 'sources' pattern`);
          sourcesMatches.slice(0, 2).forEach(m => {
            console.log('   ', m.replace(/\s+/g, ' ').substring(0, 100));
          });
          found = true;
        }
      }
      
      // Check for encryption
      if (js.includes('encrypt') || js.includes('AES') || js.includes('cipher')) {
        console.log(`[${filename}] Contains encryption code`);
        
        // Look for key patterns
        const keyPatterns = js.match(/key\s*[:=]\s*["'`][^"'`]+["'`]/gi) || [];
        if (keyPatterns.length > 0) {
          console.log('   Keys found:', keyPatterns.slice(0, 3));
        }
        found = true;
      }
      
      // Check for XOR patterns
      if (js.includes('XOR') || js.match(/\^\s*\d+/)) {
        console.log(`[${filename}] Contains XOR operations`);
        found = true;
      }
      
      // Check for alphabet substitution
      if (js.includes('abcdefghijklmnopqrstuvwxyz') || js.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ')) {
        console.log(`[${filename}] Contains alphabet (possible substitution cipher)`);
        
        // Look for shuffled alphabets
        const alphabets = js.match(/["'`][A-Za-z0-9_-]{64}["'`]/g) || [];
        if (alphabets.length > 0) {
          console.log('   Possible alphabets:', alphabets.slice(0, 2));
        }
        found = true;
      }
      
    } catch (e) {
      // Skip failed fetches
    }
  }
  
  // Step 4: Look at the 860 chunk specifically (mentioned in earlier output)
  console.log('\n3. Analyzing 860 chunk (sources pattern found earlier)...');
  
  const chunk860Url = chunkUrls.find(u => u.includes('860-'));
  if (chunk860Url) {
    const res = await fetch(chunk860Url);
    const js = await res.text();
    
    // Look for the API hash or URL building logic
    console.log('   Chunk size:', js.length);
    
    // Find all string literals that look like API paths
    const apiPaths = js.match(/["'`]\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+["'`]/g) || [];
    console.log('   API-like paths:', [...new Set(apiPaths)].slice(0, 10));
    
    // Look for the encoding function
    const encodeMatches = js.match(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*(?:encrypt|encode|btoa)[^}]*\}/g) || [];
    if (encodeMatches.length > 0) {
      console.log('   Encoding functions found:', encodeMatches.length);
    }
    
    // Look for constants that might be the API hash
    const hexConstants = js.match(/["'`][a-f0-9]{32,}["'`]/g) || [];
    console.log('   Hex constants:', hexConstants.slice(0, 5));
  }
  
  // Step 5: Try to find the API by making test requests
  console.log('\n4. Testing API endpoints...');
  
  // Get pageData from the page
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('   pageData:', pageData?.substring(0, 50));
  
  // Try different API patterns
  const testPatterns = [
    `${BASE_URL}/api/sources`,
    `${BASE_URL}/api/stream`,
    `${BASE_URL}/api/movie/550`,
  ];
  
  for (const testUrl of testPatterns) {
    try {
      const res = await fetch(testUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      console.log(`   ${testUrl}: ${res.status}`);
    } catch (e) {
      console.log(`   ${testUrl}: Error`);
    }
  }
}

reverseApi().catch(console.error);
