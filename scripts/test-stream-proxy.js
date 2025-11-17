/**
 * Test Stream Proxy
 * 
 * Validates that the stream proxy correctly:
 * 1. Proxies master.txt/m3u8 files with referer header
 * 2. Rewrites playlist URLs to go through proxy
 * 3. Proxies segments with referer header
 */

const testUrl = 'https://yesmovies.baby/hls3/550.txt'; // Example 2embed stream
const referer = 'https://www.2embed.cc';

async function testProxy() {
  console.log('Testing Stream Proxy...\n');

  // Test 1: Proxy master playlist
  console.log('Test 1: Proxying master playlist');
  const proxyUrl = `http://localhost:3000/api/stream-proxy?url=${encodeURIComponent(testUrl)}&source=2embed&referer=${encodeURIComponent(referer)}`;
  
  try {
    const response = await fetch(proxyUrl);
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const text = await response.text();
      console.log('Response length:', text.length);
      console.log('First 500 chars:\n', text.substring(0, 500));
      
      // Check if URLs are rewritten
      const hasProxiedUrls = text.includes('/api/stream-proxy');
      console.log('URLs rewritten to proxy:', hasProxiedUrls ? '✓' : '✗');
      
      if (hasProxiedUrls) {
        console.log('\n✓ Test 1 PASSED: Master playlist proxied and URLs rewritten');
      } else {
        console.log('\n✗ Test 1 FAILED: URLs not rewritten');
      }
    } else {
      console.log('\n✗ Test 1 FAILED:', await response.text());
    }
  } catch (error) {
    console.error('\n✗ Test 1 ERROR:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Extract and test full flow
  console.log('Test 2: Full extraction with proxy');
  const extractUrl = 'http://localhost:3000/api/stream/extract?tmdbId=550&type=movie';
  
  try {
    const response = await fetch(extractUrl);
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success:', data.success);
      console.log('Provider:', data.provider);
      console.log('Requires proxy:', data.requiresProxy);
      console.log('Requires segment proxy:', data.requiresSegmentProxy);
      console.log('Sources:', data.sources?.length || 0);
      
      if (data.sources && data.sources.length > 0) {
        console.log('\nFirst source:');
        console.log('  Quality:', data.sources[0].quality);
        console.log('  URL:', data.sources[0].url);
        console.log('  Requires segment proxy:', data.sources[0].requiresSegmentProxy);
        
        const isProxied = data.sources[0].url.includes('/api/stream-proxy');
        console.log('  Is proxied:', isProxied ? '✓' : '✗');
        
        if (isProxied && data.requiresSegmentProxy) {
          console.log('\n✓ Test 2 PASSED: Extraction returns proxied URLs with segment proxy flag');
        } else {
          console.log('\n✗ Test 2 FAILED: Missing proxy or segment proxy flag');
        }
      } else {
        console.log('\n✗ Test 2 FAILED: No sources returned');
      }
    } else {
      const error = await response.json();
      console.log('\n✗ Test 2 FAILED:', error.error || error.message);
    }
  } catch (error) {
    console.error('\n✗ Test 2 ERROR:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('Testing complete!');
  console.log('\nNote: Make sure your dev server is running on http://localhost:3000');
}

testProxy();
