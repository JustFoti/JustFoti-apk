// Extract and decode the 1movies API hash from the 860 chunk
require('dotenv').config({ path: '.env.local' });

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

async function extractHash() {
  console.log('=== Extracting 1movies API Hash ===\n');
  
  // Fetch the 860 chunk
  const chunkUrl = 'https://111movies.com/_next/static/chunks/860-458a7ce1ee2061c2.js';
  const res = await fetch(chunkUrl, { headers: HEADERS });
  const code = await res.text();
  
  console.log('Chunk size:', code.length);
  
  // Find the string array
  const arrayMatch = code.match(/var\s+(\w+)\s*=\s*\[((?:"[^"]*",?\s*)+)\]/);
  if (arrayMatch) {
    console.log('\n1. Found string array');
    const strings = arrayMatch[2].match(/"([^"]*)"/g).map(s => s.slice(1, -1));
    console.log('   Array length:', strings.length);
    console.log('   First 10 strings:', strings.slice(0, 10));
  }
  
  // Find the decoder function and offset
  const offsetMatch = code.match(/function\s+\w+\s*\(\s*\w+\s*,\s*\w+\s*\)\s*\{[^}]*(\d{3})[^}]*\}/);
  if (offsetMatch) {
    console.log('\n2. Found offset:', offsetMatch[1]);
  }
  
  // Find the fetch URL construction
  console.log('\n3. Analyzing fetch URL construction...');
  
  // Look for the pattern around /ar
  const arContext = code.match(/.{500}913b00773\/ar.{200}/);
  if (arContext) {
    console.log('   Context around /ar:');
    console.log('   ', arContext[0]);
  }
  
  // Extract all literal strings that look like hash parts
  console.log('\n4. Extracting literal hash parts...');
  const hashParts = [];
  
  // Look for hex-like strings
  const hexMatches = code.matchAll(/"([a-f0-9]{8,})"/g);
  for (const m of hexMatches) {
    if (!hashParts.includes(m[1])) {
      hashParts.push(m[1]);
      console.log('   Hex:', m[1]);
    }
  }
  
  // Look for strings with dashes (UUID-like)
  const uuidMatches = code.matchAll(/"([0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-)"/g);
  for (const m of uuidMatches) {
    console.log('   UUID-like:', m[1]);
  }
  
  // Find the actual fetch call
  console.log('\n5. Finding fetch call pattern...');
  const fetchMatch = code.match(/fetch\s*\(\s*["'`]?\s*\/\s*["'`]?\s*\+\s*(\w+)/);
  if (fetchMatch) {
    console.log('   Fetch starts with variable:', fetchMatch[1]);
  }
  
  // Look for the URL concatenation pattern
  const concatMatch = code.match(/["']\/["']\s*\+\s*\w+\s*\+\s*["']\/["']\s*\+\s*\w+\s*\+\s*["']([^"']+)["']/);
  if (concatMatch) {
    console.log('   URL pattern ends with:', concatMatch[1]);
  }
  
  // Find all r() and t() calls in the hash construction
  console.log('\n6. Extracting r() and t() calls...');
  
  // The hash is built like: r(196,1215)+r(433,-37)+...+"88bf9898b9"+...+"913b00773/ar"
  const hashBuildMatch = code.match(/=\s*((?:r\(\d+,\s*-?\d+\)|t\(\d+,\s*\d+,\s*\d+,\s*\d+\)|"[^"]*"|\+)+).*?\/ar/);
  if (hashBuildMatch) {
    console.log('   Hash build pattern:');
    console.log('   ', hashBuildMatch[1].substring(0, 500));
  }
  
  // Now let's try to decode the string array
  console.log('\n7. Decoding string array...');
  
  // Extract the full array
  const fullArrayMatch = code.match(/var\s+\w+\s*=\s*(\[[^\]]+\])/);
  if (fullArrayMatch) {
    try {
      const arr = eval(fullArrayMatch[1]);
      console.log('   Decoded array length:', arr.length);
      
      // Custom base64 decode
      const customAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
      const standardAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      
      function customDecode(str) {
        // Swap alphabets
        let swapped = '';
        for (const c of str) {
          const idx = customAlphabet.indexOf(c);
          if (idx >= 0) {
            swapped += standardAlphabet[idx];
          } else {
            swapped += c;
          }
        }
        try {
          return Buffer.from(swapped, 'base64').toString('utf8');
        } catch {
          return null;
        }
      }
      
      // Decode each string
      const decoded = arr.map((s, i) => {
        const d = customDecode(s);
        return { index: i, original: s, decoded: d };
      });
      
      // Show decoded strings that look like hash parts
      console.log('\n   Decoded strings that look like hash parts:');
      for (const d of decoded) {
        if (d.decoded && /^[a-f0-9]+$/.test(d.decoded) && d.decoded.length >= 8) {
          console.log(`   [${d.index}] ${d.decoded}`);
        }
      }
      
      // Now try to figure out the r() function
      // r(n, e) typically does: arr[n - offset]
      const offset = 338; // From previous analysis
      
      console.log('\n8. Testing r() function with offset', offset);
      
      // The hash build uses r(196,1215), r(433,-37), etc.
      // r(n, e) = arr[n - offset] but with some transformation
      
      // Actually looking at the code, r() might be: arr[n + e - offset] or similar
      // Let's try different interpretations
      
      const rCalls = [
        [196, 1215],
        [433, -37],
        [389, -82],
        [386, -58],
      ];
      
      console.log('   Testing r() calls:');
      for (const [a, b] of rCalls) {
        // Try different formulas
        const idx1 = a - offset;
        const idx2 = a + b - offset;
        const idx3 = b - offset;
        
        console.log(`   r(${a}, ${b}):`);
        if (idx1 >= 0 && idx1 < decoded.length) {
          console.log(`     arr[${a}-${offset}=${idx1}] = ${decoded[idx1]?.decoded || 'N/A'}`);
        }
        if (idx2 >= 0 && idx2 < decoded.length) {
          console.log(`     arr[${a}+${b}-${offset}=${idx2}] = ${decoded[idx2]?.decoded || 'N/A'}`);
        }
      }
      
    } catch (e) {
      console.log('   Error decoding array:', e.message);
    }
  }
  
  // Let's also look for the actual hash in a different way
  console.log('\n9. Looking for complete hash pattern...');
  
  // The hash should be 64 hex chars
  const hash64Match = code.match(/["']([a-f0-9]{64})["']/);
  if (hash64Match) {
    console.log('   Found 64-char hash:', hash64Match[1]);
  }
  
  // Look for the pageData encoding
  console.log('\n10. Looking for pageData encoding...');
  const encodeMatch = code.match(/pageProps\.data|pageData|props\.data/);
  if (encodeMatch) {
    console.log('   Found pageData reference');
  }
}

extractHash().catch(console.error);
