// Find 1movies API hash by looking at the actual API patterns
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function findApiHash() {
  console.log('Finding 1movies API hash...\n');
  
  // Fetch the page
  const pageResponse = await fetch(`${BASE_URL}/movie/550`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  
  const html = await pageResponse.text();
  
  // Find the main app bundle
  const appBundleMatch = html.match(/<script[^>]*src="([^"]*_app[^"]*\.js)"[^>]*>/);
  if (!appBundleMatch) {
    console.log('Could not find _app bundle');
    return;
  }
  
  const appBundleUrl = appBundleMatch[1].startsWith('http') ? appBundleMatch[1] : `${BASE_URL}${appBundleMatch[1]}`;
  console.log('Fetching app bundle:', appBundleUrl);
  
  const appJs = await (await fetch(appBundleUrl)).text();
  
  // Look for API route patterns like: "/HASH/encoded/sr" or "concat("/HASH/")"
  const apiPatterns = [
    // Pattern: concat("/HASH/")
    /concat\s*\(\s*["']\/([a-f0-9]{64})\/["']\s*\)/gi,
    // Pattern: "/HASH/" + 
    /["']\/([a-f0-9]{64})\/["']\s*\+/gi,
    // Pattern: fetch("/HASH/
    /fetch\s*\(\s*["']\/([a-f0-9]{64})\//gi,
    // Pattern: "/HASH/".concat
    /["']\/([a-f0-9]{64})\/["']\.concat/gi,
    // Pattern: API_HASH = "HASH"
    /(?:API_HASH|apiHash|hash)\s*[=:]\s*["']([a-f0-9]{64})["']/gi,
  ];
  
  const foundHashes = new Set();
  
  for (const pattern of apiPatterns) {
    let match;
    while ((match = pattern.exec(appJs)) !== null) {
      foundHashes.add(match[1]);
    }
  }
  
  if (foundHashes.size > 0) {
    console.log('\nFound API hash candidates:');
    [...foundHashes].forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
  } else {
    console.log('\nNo API hash found via patterns. Searching for /sr endpoint...');
    
    // Look for the /sr endpoint pattern
    const srPattern = /\/([a-f0-9]{64})\/[^"']*\/sr/gi;
    let match;
    while ((match = srPattern.exec(appJs)) !== null) {
      foundHashes.add(match[1]);
    }
    
    if (foundHashes.size > 0) {
      console.log('\nFound via /sr pattern:');
      [...foundHashes].forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
    }
  }
  
  // Also check for the encryption keys pattern
  console.log('\nLooking for encryption key patterns...');
  const keyPatterns = appJs.match(/new\s+Uint8Array\s*\(\s*\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]\s*\)/g);
  if (keyPatterns) {
    console.log('Found Uint8Array patterns:', keyPatterns.length);
    keyPatterns.slice(0, 3).forEach(p => console.log('  ', p.substring(0, 80)));
  }
}

findApiHash().catch(console.error);
