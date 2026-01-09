// Build the correct 1movies API hash by filtering out JS keywords
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

// JS keywords and common strings that should NOT be in the hash
const GARBAGE_STRINGS = new Set([
  'toString', '_episode', 'join', 'catch', 'autoplay', 'timeout', 'href',
  '_data', 'cript', 'kPbqz', 'OqPPd', 'lKIbL', 'VsTCr', '_uAyGx3Z42', 'CAbcK',
  'fromCharCo', 'charCodeAt', 'createCiph', 'addEventLi',
  '1844661bPEXkU', // This looks like a React ID, not a hash part
]);

async function buildHash() {
  console.log('Building correct 1movies API hash...\n');
  
  // The hash is built from these parts (in order):
  // Some are literals, some are decoded
  
  // From the analysis, the REAL hash parts seem to be:
  // ec6fdebe97 + d30afdf5f7 + 0ad4d3e108 + pTGy82DLIz + 144vhCiwj + 4156RBlfrg + pliKjWPhvP + aes-256-cb + /sr + 0363-4e1b-5482-8d76- + 1GLf2TIhby + 4b/e993fc0bc499fdfb502f96b8596 + jw4CVCy8jn + 88bf9898b9 + 308990ZeDIin + 913b00773/ar
  
  // But wait - the hash shouldn't contain "/sr" in the middle!
  // Let me re-analyze the structure
  
  // Looking at the original code:
  // m = [parts] + "/sr" + "0363-4e1b-5482-8d76-" + [parts] + "4b/e993fc0bc499fdfb502f96b8596" + [parts] + "913b00773/ar"
  
  // This suggests the hash structure is:
  // HASH_PART_1/sr0363-4e1b-5482-8d76-HASH_PART_2/e993fc0bc499fdfb502f96b8596HASH_PART_3/ar
  
  // Wait, that doesn't make sense either. Let me look at the fetch URL again:
  // fetch("/" + m + "/" + p + r(368,-104))
  // Where r(368,-104) = "fromCharCo" (garbage)
  
  // So the URL is: /{m}/{p}/{endpoint}
  // And m contains the full path including /sr, /e993..., /ar
  
  // This means m is NOT just a hash - it's a PATH with multiple segments!
  
  // Let me try to extract just the hash parts without the path segments
  
  // The structure seems to be:
  // HASH/sr0363-4e1b-5482-8d76-HASH2/e993fc0bc499fdfb502f96b8596HASH3/ar
  
  // Let me split by "/" to understand the structure
  const fullPath = 'ec6fdebe97d30afdf5f70ad4d3e108pTGy82DLIz144vhCiwj4156RBlfrgpliKjWPhvPaes-256-cb/sr0363-4e1b-5482-8d76-1GLf2TIhby4b/e993fc0bc499fdfb502f96b8596jw4CVCy8jn88bf9898b9308990ZeDIin/ar';
  
  console.log('Full path (without garbage):', fullPath);
  
  // Split by /
  const parts = fullPath.split('/');
  console.log('Parts:', parts);
  
  // Get pageData
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await pageRes.text();
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('\npageData:', pageData);
  
  // Test different URL structures
  console.log('\n=== Testing URL structures ===');
  
  const testUrls = [
    // Full path as hash
    `/${fullPath}/${pageData}`,
    // First part as hash, rest as path
    `/${parts[0]}/${pageData}/sr${parts[1]}/${parts[2]}`,
    // Try without the garbage strings
    `/ec6fdebe97d30afdf5f70ad4d3e108pTGy82DLIz144vhCiwj4156RBlfrgpliKjWPhvP/${pageData}/sr`,
    // Try with just hex parts
    `/ec6fdebe97d30afdf5f70ad4d3e108/${pageData}/sr`,
  ];
  
  for (const url of testUrls) {
    try {
      const testRes = await fetch(`${BASE_URL}${url}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `${BASE_URL}/movie/550`,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/octet-stream',
        }
      });
      console.log(`${url.substring(0, 60)}...: ${testRes.status}`);
      if (testRes.ok) {
        const text = await testRes.text();
        console.log('  Response:', text.substring(0, 200));
      }
    } catch (e) {
      console.log(`${url.substring(0, 60)}...: Error`);
    }
  }
  
  // Let me try a completely different approach - look at what the ACTUAL hash looks like
  // by examining the network request in the browser
  
  // The old hash was: fcd552c4321aeac1e62c5304913b3420be75a19d390807281a425aabbb5dc4c0
  // This is 64 hex chars
  
  // The new hash parts that look like hex:
  // ec6fdebe97 (10 chars)
  // d30afdf5f7 (10 chars)
  // 0ad4d3e108 (10 chars)
  // 144vhCiwj (9 chars, but has letters)
  // 4156RBlfrg (10 chars, but has letters)
  // 1GLf2TIhby (10 chars)
  // jw4CVCy8jn (10 chars)
  // 308990ZeDIin (12 chars)
  
  // These don't look like a standard hash format
  
  // Let me try to find the actual API by looking at the 447 chunk
  console.log('\n=== Checking 447 chunk for API ===');
  
  const chunk447Url = `${BASE_URL}/_next/static/chunks/447-fe56a0e3dc1326d4.js`;
  const chunk447Res = await fetch(chunk447Url);
  const chunk447Js = await chunk447Res.text();
  
  // Look for fetch calls
  const fetchCalls = chunk447Js.match(/fetch\s*\([^)]+\)/g) || [];
  console.log('Fetch calls in 447:', fetchCalls.length);
  fetchCalls.slice(0, 5).forEach(f => console.log('  ', f.substring(0, 100)));
  
  // Look for API-like strings
  const apiStrings = chunk447Js.match(/["']\/api\/[^"']+["']/g) || [];
  console.log('API strings:', apiStrings);
}

buildHash().catch(console.error);
