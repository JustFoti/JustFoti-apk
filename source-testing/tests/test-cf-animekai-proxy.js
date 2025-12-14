/**
 * Test the Cloudflare Worker /animekai proxy endpoint
 * This tests the full flow: CF Worker -> RPI Proxy -> MegaUp CDN
 * 
 * Run: node source-testing/tests/test-cf-animekai-proxy.js
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

// Test URL - a MegaUp media endpoint
const TEST_MEGAUP_URL = 'https://megaup22.online/media/mZPgb3GwWS2JcOLzFLxC7hHpCQ';

async function testProxy() {
  console.log('Testing Cloudflare Worker AnimeKai proxy endpoint...\n');
  
  // First check health
  console.log('=== Step 1: Check health ===');
  try {
    const healthResponse = await fetch(`${CF_PROXY_URL}/animekai/health`);
    const healthData = await healthResponse.json();
    console.log('Health:', JSON.stringify(healthData, null, 2));
    
    if (!healthData.rpiProxy?.configured) {
      console.log('\n✗ RPI proxy is NOT configured! Cannot proceed.');
      console.log('  Set RPI_PROXY_URL and RPI_PROXY_KEY secrets in Cloudflare Worker');
      return;
    }
    console.log('✓ RPI proxy is configured');
  } catch (error) {
    console.error('Health check failed:', error.message);
    return;
  }
  
  // Test the proxy
  console.log('\n=== Step 2: Test proxy ===');
  console.log(`Target URL: ${TEST_MEGAUP_URL}`);
  
  const proxyUrl = `${CF_PROXY_URL}/animekai?url=${encodeURIComponent(TEST_MEGAUP_URL)}`;
  console.log(`Proxy URL: ${proxyUrl.substring(0, 100)}...`);
  
  try {
    // Note: Server-side requests (no Origin/Referer) should now be allowed
    const response = await fetch(proxyUrl);
    console.log(`\nStatus: ${response.status}`);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✓ SUCCESS!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('\n✗ FAILED!');
      console.log('Error:', errorText.substring(0, 500));
    }
  } catch (error) {
    console.error('Proxy request failed:', error.message);
  }
}

testProxy();
