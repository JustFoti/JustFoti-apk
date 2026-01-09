// Crack 1movies authentication
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function crackAuth() {
  console.log('Cracking 1movies authentication...\n');
  
  // Step 1: Fetch the page and capture all headers/cookies
  const pageUrl = `${BASE_URL}/movie/550`;
  console.log('1. Fetching page:', pageUrl);
  
  const pageRes = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const html = await pageRes.text();
  
  // Get cookies
  const cookies = pageRes.headers.get('set-cookie');
  console.log('   Cookies:', cookies?.substring(0, 100) || 'none');
  
  // Get __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log('   pageData:', pageData?.substring(0, 50));
  
  // Step 2: Try the API with different auth methods
  console.log('\n2. Testing API with different auth methods...');
  
  const apiUrl = `${BASE_URL}/api/movie/550`;
  
  // Test 1: With cookies
  console.log('\n   Test 1: With cookies');
  const res1 = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookies || '',
      'Referer': pageUrl,
    }
  });
  console.log('   Status:', res1.status);
  if (res1.status !== 401) {
    const text = await res1.text();
    console.log('   Response:', text.substring(0, 200));
  }
  
  // Test 2: With X-Requested-With
  console.log('\n   Test 2: With X-Requested-With');
  const res2 = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': pageUrl,
    }
  });
  console.log('   Status:', res2.status);
  
  // Test 3: With pageData as body
  console.log('\n   Test 3: POST with pageData');
  const res3 = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/json',
      'Referer': pageUrl,
    },
    body: JSON.stringify({ data: pageData })
  });
  console.log('   Status:', res3.status);
  if (res3.status !== 401 && res3.status !== 404) {
    const text = await res3.text();
    console.log('   Response:', text.substring(0, 200));
  }
  
  // Test 4: With pageData in query
  console.log('\n   Test 4: With pageData in query');
  const res4 = await fetch(`${apiUrl}?data=${encodeURIComponent(pageData)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': pageUrl,
    }
  });
  console.log('   Status:', res4.status);
  
  // Test 5: Try /api/sources with pageData
  console.log('\n   Test 5: /api/sources with pageData');
  const res5 = await fetch(`${BASE_URL}/api/sources`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/json',
      'Referer': pageUrl,
    },
    body: JSON.stringify({ data: pageData })
  });
  console.log('   Status:', res5.status);
  
  // Step 3: Look for auth tokens in the page
  console.log('\n3. Looking for auth tokens in page...');
  
  // Look for JWT-like tokens
  const jwtPattern = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g);
  if (jwtPattern) {
    console.log('   JWT tokens found:', jwtPattern.length);
    jwtPattern.slice(0, 2).forEach(t => console.log('     ', t.substring(0, 50)));
  }
  
  // Look for API keys
  const apiKeyPattern = html.match(/["']([a-zA-Z0-9]{32,})["']/g);
  if (apiKeyPattern) {
    console.log('   Possible API keys:', apiKeyPattern.length);
  }
  
  // Step 4: Check if the API uses the pageData directly
  console.log('\n4. Testing direct pageData usage...');
  
  // The pageData might BE the auth token
  const res6 = await fetch(`${BASE_URL}/api/movie/550`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Authorization': `Bearer ${pageData}`,
      'Referer': pageUrl,
    }
  });
  console.log('   With Bearer token:', res6.status);
  
  // Try as X-Auth header
  const res7 = await fetch(`${BASE_URL}/api/movie/550`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Auth': pageData,
      'Referer': pageUrl,
    }
  });
  console.log('   With X-Auth header:', res7.status);
  
  // Step 5: Check the 860 chunk for the actual API call
  console.log('\n5. Looking for API call in 860 chunk...');
  
  const chunkUrl = `${BASE_URL}/_next/static/chunks/860-458a7ce1ee2061c2.js`;
  const chunkRes = await fetch(chunkUrl);
  const js = await chunkRes.text();
  
  // Look for fetch patterns
  const fetchPatterns = js.match(/fetch\s*\([^)]+\)/g) || [];
  console.log('   fetch() calls:', fetchPatterns.length);
  fetchPatterns.slice(0, 5).forEach(f => console.log('     ', f.substring(0, 80)));
  
  // Look for the API URL construction
  const apiConstruction = js.match(/["'`]\/api\/[^"'`]+["'`]/g) || [];
  console.log('   API paths:', apiConstruction);
}

crackAuth().catch(console.error);
