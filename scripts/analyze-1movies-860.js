// Deep analysis of 1movies 860 chunk
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function analyze() {
  console.log('Analyzing 1movies 860 chunk...\n');
  
  // Fetch the page to get chunk URL
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await pageRes.text();
  
  // Find 860 chunk
  const chunk860Match = html.match(/_next\/static\/chunks\/860-[^"]+\.js/);
  if (!chunk860Match) {
    console.log('860 chunk not found');
    return;
  }
  
  const chunkUrl = `${BASE_URL}/${chunk860Match[0]}`;
  console.log('Fetching:', chunkUrl);
  
  const chunkRes = await fetch(chunkUrl);
  const js = await chunkRes.text();
  console.log('Chunk size:', js.length, 'bytes\n');
  
  // Look for the encoding/encryption logic
  console.log('=== Looking for encoding patterns ===\n');
  
  // 1. Find all function definitions
  const funcDefs = js.match(/function\s+(\w+)\s*\([^)]*\)/g) || [];
  console.log('Functions defined:', funcDefs.length);
  
  // 2. Look for crypto-related code
  const cryptoPatterns = [
    /subtle\.encrypt/g,
    /subtle\.importKey/g,
    /AES-CBC/g,
    /AES-GCM/g,
    /crypto\.subtle/g,
  ];
  
  for (const pattern of cryptoPatterns) {
    const matches = js.match(pattern);
    if (matches) {
      console.log(`Found ${pattern}: ${matches.length} occurrences`);
    }
  }
  
  // 3. Look for base64 encoding
  if (js.includes('btoa') || js.includes('atob')) {
    console.log('Found base64 encoding (btoa/atob)');
    
    // Get context
    const btoaIndex = js.indexOf('btoa');
    if (btoaIndex > 0) {
      console.log('btoa context:', js.substring(btoaIndex - 50, btoaIndex + 100).replace(/\s+/g, ' '));
    }
  }
  
  // 4. Look for XOR operations
  const xorMatches = js.match(/\^\s*\d+|\d+\s*\^/g) || [];
  if (xorMatches.length > 0) {
    console.log('XOR operations:', xorMatches.slice(0, 5));
  }
  
  // 5. Look for character code operations
  if (js.includes('charCodeAt') || js.includes('fromCharCode')) {
    console.log('Found character code operations');
  }
  
  // 6. Look for the specific encoding function
  // The old code used: AES encrypt → hex → XOR → UTF-8 → Base64 → char substitution
  
  // Find shuffled alphabet (64 chars for base64url)
  const alphabetMatches = js.match(/["'`]([A-Za-z0-9_-]{64})["'`]/g) || [];
  if (alphabetMatches.length > 0) {
    console.log('\nPossible shuffled alphabets:');
    alphabetMatches.forEach(a => console.log('  ', a));
  }
  
  // 7. Look for the API hash pattern
  // It might be built dynamically now
  console.log('\n=== Looking for API URL building ===\n');
  
  // Look for concat or template literals with paths
  const concatPatterns = js.match(/concat\s*\([^)]+\)/g) || [];
  console.log('concat() calls:', concatPatterns.length);
  
  // Look for fetch calls
  const fetchCalls = js.match(/fetch\s*\([^)]+\)/g) || [];
  console.log('fetch() calls:', fetchCalls.length);
  
  // 8. Look for the /sr endpoint
  if (js.includes('/sr')) {
    const srIndex = js.indexOf('/sr');
    const context = js.substring(Math.max(0, srIndex - 300), srIndex + 100);
    console.log('\n/sr endpoint context:');
    console.log(context.replace(/\s+/g, ' '));
  }
  
  // 9. Extract all string literals that look like API paths
  const pathLiterals = js.match(/["'`]\/[a-zA-Z0-9\/_-]+["'`]/g) || [];
  const uniquePaths = [...new Set(pathLiterals)];
  console.log('\nAPI-like paths:', uniquePaths.filter(p => p.length > 5 && p.length < 100).slice(0, 20));
  
  // 10. Look for the specific keys used in encryption
  console.log('\n=== Looking for encryption keys ===\n');
  
  // Look for Uint8Array with numbers (likely keys)
  const uint8Matches = js.match(/new\s+Uint8Array\s*\(\s*\[[^\]]+\]\s*\)/g) || [];
  if (uint8Matches.length > 0) {
    console.log('Uint8Array definitions:');
    uint8Matches.forEach(m => console.log('  ', m.substring(0, 100)));
  }
  
  // Look for hex strings that could be keys
  const hexKeys = js.match(/["'`][0-9a-f]{32,64}["'`]/gi) || [];
  if (hexKeys.length > 0) {
    console.log('Hex strings (possible keys):');
    hexKeys.slice(0, 5).forEach(k => console.log('  ', k));
  }
  
  // 11. Check if they're using a different API structure now
  console.log('\n=== Checking for new API patterns ===\n');
  
  // Look for GraphQL
  if (js.includes('graphql') || js.includes('query') && js.includes('mutation')) {
    console.log('Possible GraphQL usage detected');
  }
  
  // Look for REST patterns
  const restPatterns = js.match(/["'`](GET|POST|PUT|DELETE)["'`]/g) || [];
  if (restPatterns.length > 0) {
    console.log('REST methods:', [...new Set(restPatterns)]);
  }
  
  // 12. Save a portion of the chunk for manual analysis
  console.log('\n=== Saving chunk excerpt for analysis ===\n');
  
  // Find the most relevant section (around sources/stream keywords)
  const sourcesIndex = js.indexOf('sources');
  if (sourcesIndex > 0) {
    const excerpt = js.substring(Math.max(0, sourcesIndex - 500), sourcesIndex + 1000);
    console.log('Excerpt around "sources":');
    console.log(excerpt.replace(/\s+/g, ' ').substring(0, 500));
  }
}

analyze().catch(console.error);
