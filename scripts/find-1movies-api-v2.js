// Find 1movies API hash by checking all bundles
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function findApiHash() {
  console.log('Finding 1movies API hash in all bundles...\n');
  
  // Fetch the page
  const pageResponse = await fetch(`${BASE_URL}/movie/550`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  
  const html = await pageResponse.text();
  
  // Find all script bundles
  const scriptMatches = [...html.matchAll(/<script[^>]*src="([^"]*\.js)"[^>]*>/g)];
  console.log('Found', scriptMatches.length, 'script bundles\n');
  
  const foundHashes = new Set();
  
  for (const match of scriptMatches) {
    const scriptUrl = match[1].startsWith('http') ? match[1] : `${BASE_URL}${match[1]}`;
    
    if (!scriptUrl.includes('_next/static/chunks/')) continue;
    
    try {
      const js = await (await fetch(scriptUrl)).text();
      
      // Look for API route patterns
      const patterns = [
        /concat\s*\(\s*["']\/([a-f0-9]{64})\/["']\s*\)/gi,
        /["']\/([a-f0-9]{64})\/["']\s*\+/gi,
        /["']\/([a-f0-9]{64})\/["']\.concat/gi,
        /\+\s*["']\/([a-f0-9]{64})\/["']/gi,
        /["']([a-f0-9]{64})["']\s*\+\s*["']\/["']/gi,
      ];
      
      for (const pattern of patterns) {
        let m;
        while ((m = pattern.exec(js)) !== null) {
          foundHashes.add(m[1]);
          console.log(`Found in ${scriptUrl.split('/').pop()}: ${m[1]}`);
        }
      }
      
      // Also look for the specific pattern: "".concat("/HASH/")
      const concatPattern = /["']["']\s*\.concat\s*\(\s*["']\/([a-f0-9]{64})\/["']\s*\)/gi;
      let m;
      while ((m = concatPattern.exec(js)) !== null) {
        foundHashes.add(m[1]);
        console.log(`Found concat pattern in ${scriptUrl.split('/').pop()}: ${m[1]}`);
      }
      
      // Look for variable assignment
      const varPattern = /[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*["']([a-f0-9]{64})["']/gi;
      while ((m = varPattern.exec(js)) !== null) {
        // Filter out crypto constants (those with lots of f's)
        if (!m[1].includes('ffffffff') && !m[1].startsWith('0000')) {
          foundHashes.add(m[1]);
          console.log(`Found var assignment in ${scriptUrl.split('/').pop()}: ${m[1]}`);
        }
      }
      
    } catch (e) {
      // Skip failed fetches
    }
  }
  
  console.log('\n=== Summary ===');
  if (foundHashes.size > 0) {
    console.log('Unique API hash candidates:');
    [...foundHashes].forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
  } else {
    console.log('No API hash found. The site may have changed their approach.');
  }
}

findApiHash().catch(console.error);
