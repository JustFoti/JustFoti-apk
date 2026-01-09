// Find 1movies API hash by checking ALL chunks
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function findInAllChunks() {
  console.log('Finding 1movies API hash in all chunks...\n');
  
  // Fetch the page to get buildId
  const pageResponse = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await pageResponse.text();
  
  // Get buildId
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const buildId = nextData.buildId;
  console.log('Build ID:', buildId);
  
  // Get all script URLs from the page
  const scriptUrls = [...html.matchAll(/src="([^"]*\.js)"/g)].map(m => m[1]);
  console.log('Found', scriptUrls.length, 'scripts\n');
  
  const allHashes = new Map(); // hash -> context
  
  for (const scriptPath of scriptUrls) {
    const scriptUrl = scriptPath.startsWith('http') ? scriptPath : `${BASE_URL}${scriptPath}`;
    
    try {
      const js = await (await fetch(scriptUrl)).text();
      const filename = scriptUrl.split('/').pop();
      
      // Look for 64-char hex strings
      const hexMatches = js.match(/[a-f0-9]{64}/g) || [];
      
      for (const hash of hexMatches) {
        // Skip crypto constants
        if (hash.includes('ffffffff') || hash.startsWith('0000') || hash.endsWith('0000')) continue;
        
        // Get context
        const idx = js.indexOf(hash);
        const start = Math.max(0, idx - 50);
        const end = Math.min(js.length, idx + hash.length + 50);
        const context = js.substring(start, end);
        
        // Check if this looks like an API hash (used in URL construction)
        if (context.includes('/') || context.includes('concat') || context.includes('fetch')) {
          if (!allHashes.has(hash)) {
            allHashes.set(hash, { file: filename, context });
          }
        }
      }
      
      // Also look for the specific pattern: "".concat("/HASH/")
      const concatMatches = js.matchAll(/["']["']\s*\.concat\s*\(\s*["']\/([a-f0-9]{64})\/["']/gi);
      for (const m of concatMatches) {
        allHashes.set(m[1], { file: filename, context: 'concat pattern', isApiHash: true });
      }
      
      // Look for: "/" + HASH + "/"
      const plusMatches = js.matchAll(/["']\/["']\s*\+\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\+\s*["']\/["']/g);
      for (const m of plusMatches) {
        // This is a variable reference, need to find the variable value
        const varName = m[1];
        const varMatch = js.match(new RegExp(`${varName}\\s*=\\s*["']([a-f0-9]{64})["']`));
        if (varMatch) {
          allHashes.set(varMatch[1], { file: filename, context: `variable ${varName}`, isApiHash: true });
        }
      }
      
    } catch (e) {
      // Skip failed fetches
    }
  }
  
  console.log('=== Found Hashes ===');
  if (allHashes.size > 0) {
    for (const [hash, info] of allHashes) {
      console.log(`\nHash: ${hash}`);
      console.log(`  File: ${info.file}`);
      console.log(`  Context: ${info.context.substring(0, 100)}...`);
      if (info.isApiHash) console.log('  *** LIKELY API HASH ***');
    }
  } else {
    console.log('No API hashes found.');
  }
}

findInAllChunks().catch(console.error);
