// Decode 1movies obfuscated strings
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function decodeObfuscated() {
  console.log('Decoding 1movies obfuscated strings...\n');
  
  // Fetch the 860 chunk
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const res = await fetch(chunkUrl);
  const js = await res.text();
  
  // The obfuscated code uses functions r() and t() to decode strings
  // We need to find the string array and the decode function
  
  // Look for the string array (usually at the start)
  console.log('=== Looking for string array ===');
  
  // Pattern 1: Array of strings
  const arrayMatch = js.match(/\[["'][^"']+["'](?:,["'][^"']+["']){10,}\]/);
  if (arrayMatch) {
    console.log('Found string array:', arrayMatch[0].substring(0, 200));
  }
  
  // Pattern 2: Function that returns array
  const arrayFuncMatch = js.match(/function\s+\w+\s*\(\)\s*\{\s*(?:var\s+\w+\s*=\s*)?\[["'][^"']+["'](?:,["'][^"']+["']){5,}\]/);
  if (arrayFuncMatch) {
    console.log('Found array function:', arrayFuncMatch[0].substring(0, 300));
  }
  
  // Look for the specific strings we found
  console.log('\n=== Extracting known strings ===');
  
  // From the context: "0363-4e1b-5482-8d76-" and "IWllVsuBx0Iy"
  // These are likely parts of the API hash and auth token
  
  // Find all string literals that look like parts of a hash
  const hashParts = js.match(/["'][0-9a-f]{4}-[0-9a-f]{4}["']/gi) || [];
  console.log('Hash-like parts:', hashParts);
  
  // Find all string literals that look like tokens
  const tokenParts = js.match(/["'][A-Za-z0-9+/=]{10,}["']/g) || [];
  console.log('Token-like strings:', tokenParts.slice(0, 20));
  
  // Look for the full context of the fetch call
  console.log('\n=== Full fetch context ===');
  
  // Find the fetch and extract surrounding 2000 chars
  const fetchIndex = js.indexOf('fetch("/"+m+"/"+p');
  if (fetchIndex > -1) {
    const start = Math.max(0, fetchIndex - 1500);
    const end = Math.min(js.length, fetchIndex + 500);
    const context = js.substring(start, end);
    
    // Extract all string literals from this context
    const strings = context.match(/["'][^"']{3,}["']/g) || [];
    console.log('Strings in fetch context:');
    strings.forEach(s => console.log('  ', s));
    
    // Look for the r() and t() function definitions
    console.log('\n=== Looking for decoder functions ===');
    
    // Find function r
    const rFuncMatch = js.match(/function\s+r\s*\([^)]*\)\s*\{[^}]+\}/);
    if (rFuncMatch) {
      console.log('Function r:', rFuncMatch[0].substring(0, 200));
    }
    
    // Find function t
    const tFuncMatch = js.match(/function\s+t\s*\([^)]*\)\s*\{[^}]+\}/);
    if (tFuncMatch) {
      console.log('Function t:', tFuncMatch[0].substring(0, 200));
    }
  }
  
  // Try to reconstruct the API hash from the obfuscated parts
  console.log('\n=== Reconstructing API hash ===');
  
  // The pattern shows: "0363-4e1b-5482-8d76-" + more parts
  // This looks like a UUID-based hash
  
  // Find all UUID-like patterns
  const uuidParts = js.match(/[0-9a-f]{4}(?:-[0-9a-f]{4}){1,}/gi) || [];
  console.log('UUID-like patterns:', uuidParts);
  
  // Look for the complete hash by finding consecutive string concatenations
  console.log('\n=== Looking for string concatenations ===');
  
  // Pattern: "str1" + "str2" + "str3"
  const concatPattern = js.match(/["'][^"']+["']\s*\+\s*["'][^"']+["'](?:\s*\+\s*["'][^"']+["'])*/g) || [];
  console.log('String concatenations:');
  concatPattern.slice(0, 10).forEach(c => console.log('  ', c));
  
  // Now let's try to find the actual API endpoint by looking at network requests
  console.log('\n=== Testing API endpoints ===');
  
  // First get pageData
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await pageRes.text();
  
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('pageData:', pageData);
  
  // Try different API patterns
  const testEndpoints = [
    `/api/sources/${pageData}`,
    `/api/movie/550/sources`,
    `/api/stream/${pageData}`,
    `/${pageData}/sr`,
    `/${pageData}/sources`,
  ];
  
  for (const endpoint of testEndpoints) {
    try {
      const testRes = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `${BASE_URL}/movie/550`,
          'X-Requested-With': 'XMLHttpRequest',
        }
      });
      console.log(`${endpoint}: ${testRes.status}`);
      if (testRes.ok) {
        const text = await testRes.text();
        console.log('  Response:', text.substring(0, 200));
      }
    } catch (e) {
      console.log(`${endpoint}: Error - ${e.message}`);
    }
  }
  
  // Look for the auth header value
  console.log('\n=== Looking for auth header ===');
  
  // The context showed: h[r(445,-7)+"en"]=t(1159,1259,1205,1222)+t(1207,1179,1184,1143)+"IWllVsuBx0Iy"
  // This is setting a header with "en" suffix (likely "X-Token" or similar)
  // The value ends with "IWllVsuBx0Iy"
  
  // Try with this token
  const testWithToken = await fetch(`${BASE_URL}/api/movie/550`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': `${BASE_URL}/movie/550`,
      'X-Token': 'IWllVsuBx0Iy',
    }
  });
  console.log('With X-Token:', testWithToken.status);
}

decodeObfuscated().catch(console.error);
