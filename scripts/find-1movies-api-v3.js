// Find the new 1movies API structure
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function findApi() {
  console.log('Finding new 1movies API structure...\n');
  
  // Step 1: Fetch the movie page
  const pageUrl = `${BASE_URL}/movie/550`;
  console.log('1. Fetching page:', pageUrl);
  
  const pageRes = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const html = await pageRes.text();
  console.log('   HTML length:', html.length);
  
  // Step 2: Look for API routes in the HTML
  console.log('\n2. Looking for API routes in HTML...');
  
  // Find all URLs that look like API endpoints
  const urlPatterns = html.match(/["'`](\/[a-zA-Z0-9\/_-]+)["'`]/g) || [];
  const apiUrls = urlPatterns.filter(u => 
    u.includes('/api') || 
    u.includes('/sr') || 
    u.includes('/sources') ||
    u.includes('/stream')
  );
  console.log('   API-like URLs:', [...new Set(apiUrls)].slice(0, 10));
  
  // Step 3: Check the __NEXT_DATA__ for API info
  console.log('\n3. Checking __NEXT_DATA__...');
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (nextDataMatch) {
    const nextData = JSON.parse(nextDataMatch[1]);
    console.log('   buildId:', nextData.buildId);
    console.log('   page:', nextData.page);
    console.log('   pageProps keys:', Object.keys(nextData.props?.pageProps || {}));
    
    // Check for any API URLs in the data
    const dataStr = JSON.stringify(nextData);
    const apiMatches = dataStr.match(/https?:\/\/[^"]+/g) || [];
    console.log('   URLs in data:', apiMatches.slice(0, 5));
  }
  
  // Step 4: Look for the encoding/API logic in the page chunks
  console.log('\n4. Analyzing page-specific chunks...');
  
  // Find page-specific JS
  const pageChunks = html.match(/_next\/static\/chunks\/pages\/[^"]+\.js/g) || [];
  console.log('   Page chunks:', pageChunks);
  
  for (const chunk of pageChunks) {
    const chunkUrl = `${BASE_URL}/${chunk}`;
    const chunkRes = await fetch(chunkUrl);
    const js = await chunkRes.text();
    
    console.log(`\n   Analyzing ${chunk.split('/').pop()}:`);
    console.log('   Size:', js.length);
    
    // Look for fetch calls
    const fetchCalls = js.match(/fetch\s*\([^)]+\)/g) || [];
    console.log('   fetch() calls:', fetchCalls.length);
    
    // Look for API patterns
    if (js.includes('/sr')) {
      console.log('   Contains /sr endpoint');
      const srContext = js.match(/.{0,100}\/sr.{0,50}/g);
      if (srContext) console.log('   Context:', srContext[0]?.substring(0, 100));
    }
    
    // Look for the hash pattern
    const hashPattern = js.match(/[a-f0-9]{64}/g);
    if (hashPattern) {
      const unique = [...new Set(hashPattern)];
      console.log('   64-char hex strings:', unique.length);
      if (unique.length <= 5) {
        unique.forEach(h => console.log('     ', h));
      }
    }
  }
  
  // Step 5: Try to find the API by looking at the main app bundle
  console.log('\n5. Checking main app bundle...');
  
  const mainChunks = html.match(/_next\/static\/chunks\/main-[^"]+\.js/g) || [];
  for (const chunk of mainChunks) {
    const chunkUrl = `${BASE_URL}/${chunk}`;
    const chunkRes = await fetch(chunkUrl);
    const js = await chunkRes.text();
    
    console.log(`   ${chunk.split('/').pop()}: ${js.length} bytes`);
    
    // Look for API configuration
    if (js.includes('apiUrl') || js.includes('API_URL') || js.includes('baseUrl')) {
      console.log('   Contains API URL config');
      const configMatch = js.match(/(?:apiUrl|API_URL|baseUrl)\s*[:=]\s*["'`][^"'`]+["'`]/gi);
      if (configMatch) console.log('   Config:', configMatch.slice(0, 3));
    }
  }
  
  // Step 6: Check if they're using a different domain for API
  console.log('\n6. Looking for external API domains...');
  
  const allChunks = html.match(/_next\/static\/[^"]+\.js/g) || [];
  const domains = new Set();
  
  for (const chunk of allChunks.slice(0, 5)) {
    const chunkUrl = `${BASE_URL}/${chunk}`;
    try {
      const chunkRes = await fetch(chunkUrl);
      const js = await chunkRes.text();
      
      // Find all domain references
      const domainMatches = js.match(/https?:\/\/[a-zA-Z0-9.-]+/g) || [];
      domainMatches.forEach(d => domains.add(d));
    } catch (e) {}
  }
  
  console.log('   External domains found:');
  [...domains].filter(d => !d.includes('111movies')).slice(0, 10).forEach(d => console.log('     ', d));
  
  // Step 7: Try common API patterns
  console.log('\n7. Testing common API patterns...');
  
  const testUrls = [
    `${BASE_URL}/api/v1/movie/550`,
    `${BASE_URL}/api/v1/sources/550`,
    `${BASE_URL}/api/movie/550`,
    `${BASE_URL}/api/sources`,
    `${BASE_URL}/api/stream/550`,
  ];
  
  for (const url of testUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      console.log(`   ${url.replace(BASE_URL, '')}: ${res.status}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log('     Response:', text.substring(0, 100));
      }
    } catch (e) {
      console.log(`   ${url.replace(BASE_URL, '')}: Error`);
    }
  }
}

findApi().catch(console.error);
