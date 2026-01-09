// Deep analysis of 1movies API structure
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function deepAnalyze() {
  console.log('Deep analysis of 1movies...\n');
  
  // Fetch the 860 chunk
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  console.log('Fetching chunk:', chunkUrl);
  
  const res = await fetch(chunkUrl);
  const js = await res.text();
  console.log('Chunk size:', js.length, 'bytes\n');
  
  // Look for the variables m and p used in fetch
  console.log('=== Looking for m and p variables ===');
  
  // Find where m is defined
  const mPatterns = js.match(/\bm\s*=\s*["'][^"']+["']/g) || [];
  console.log('m assignments:', mPatterns.slice(0, 10));
  
  // Find where p is defined  
  const pPatterns = js.match(/\bp\s*=\s*["'][^"']+["']/g) || [];
  console.log('p assignments:', pPatterns.slice(0, 10));
  
  // Look for hash-like strings (64 char hex)
  console.log('\n=== Looking for 64-char hex strings (API hashes) ===');
  const hexPatterns = js.match(/["'][a-f0-9]{64}["']/gi) || [];
  console.log('Found:', hexPatterns.length);
  hexPatterns.forEach(h => console.log('  ', h));
  
  // Look for the fetch context
  console.log('\n=== Fetch context analysis ===');
  const fetchIndex = js.indexOf('fetch("/"+m+"/"+p');
  if (fetchIndex > -1) {
    const context = js.substring(Math.max(0, fetchIndex - 500), fetchIndex + 200);
    console.log('Context around fetch:\n', context);
  }
  
  // Look for e3.current pattern
  console.log('\n=== e3.current pattern ===');
  const e3Index = js.indexOf('e3.current');
  if (e3Index > -1) {
    const context = js.substring(Math.max(0, e3Index - 300), e3Index + 300);
    console.log('Context:\n', context);
  }
  
  // Look for useRef or useState that might hold the hash
  console.log('\n=== Looking for React state/ref patterns ===');
  const refPatterns = js.match(/useRef\s*\(\s*["'][^"']+["']\s*\)/g) || [];
  console.log('useRef with strings:', refPatterns.slice(0, 10));
  
  const statePatterns = js.match(/useState\s*\(\s*["'][^"']+["']\s*\)/g) || [];
  console.log('useState with strings:', statePatterns.slice(0, 10));
  
  // Look for the encoding function
  console.log('\n=== Looking for encoding patterns ===');
  const encodePatterns = js.match(/btoa|atob|encodeURI|TextEncoder|crypto\.subtle/gi) || [];
  console.log('Encoding functions:', [...new Set(encodePatterns)]);
  
  // Look for AES patterns
  const aesPatterns = js.match(/AES|CBC|encrypt|decrypt/gi) || [];
  console.log('AES patterns:', [...new Set(aesPatterns)]);
  
  // Look for XOR patterns
  const xorPatterns = js.match(/\^\s*\d+|\bxor\b/gi) || [];
  console.log('XOR patterns:', xorPatterns.slice(0, 10));
  
  // Now let's look at the actual page to find the hash
  console.log('\n=== Analyzing page source ===');
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await pageRes.text();
  
  // Look for script tags with inline data
  const inlineScripts = html.match(/<script[^>]*>([^<]{100,})<\/script>/g) || [];
  console.log('Inline scripts:', inlineScripts.length);
  
  // Look for any 64-char hex in the page
  const pageHex = html.match(/[a-f0-9]{64}/gi) || [];
  console.log('64-char hex in page:', [...new Set(pageHex)]);
  
  // Look for buildId
  const buildIdMatch = html.match(/"buildId"\s*:\s*"([^"]+)"/);
  console.log('Build ID:', buildIdMatch?.[1]);
  
  // Check all chunks loaded
  console.log('\n=== Checking all chunks ===');
  const chunkMatches = html.match(/_next\/static\/chunks\/[^"']+/g) || [];
  console.log('Chunks:', chunkMatches.slice(0, 20));
  
  // Look for the main app chunk
  const mainChunk = chunkMatches.find(c => c.includes('main-app'));
  if (mainChunk) {
    console.log('\nFetching main-app chunk...');
    const mainRes = await fetch(`${BASE_URL}/${mainChunk}`);
    const mainJs = await mainRes.text();
    
    // Look for API hash in main chunk
    const mainHex = mainJs.match(/["'][a-f0-9]{64}["']/gi) || [];
    console.log('64-char hex in main chunk:', mainHex);
  }
  
  // Look for page-specific chunks
  const pageChunks = chunkMatches.filter(c => c.includes('page'));
  console.log('\nPage chunks:', pageChunks);
  
  for (const chunk of pageChunks.slice(0, 3)) {
    console.log(`\nFetching ${chunk}...`);
    const chunkRes = await fetch(`${BASE_URL}/${chunk}`);
    const chunkJs = await chunkRes.text();
    
    const chunkHex = chunkJs.match(/["'][a-f0-9]{64}["']/gi) || [];
    if (chunkHex.length > 0) {
      console.log('Found hex:', chunkHex);
    }
    
    // Look for fetch patterns
    const fetchCalls = chunkJs.match(/fetch\s*\([^)]+\)/g) || [];
    if (fetchCalls.length > 0) {
      console.log('Fetch calls:', fetchCalls.slice(0, 5));
    }
  }
}

deepAnalyze().catch(console.error);
