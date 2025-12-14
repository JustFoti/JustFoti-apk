/**
 * Test the Cloudflare Worker /animekai/health endpoint
 * This verifies that the RPI proxy is configured correctly
 * 
 * Run: node source-testing/tests/test-cf-animekai-health.js
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function testHealth() {
  console.log('Testing Cloudflare Worker AnimeKai health endpoint...\n');
  console.log(`URL: ${CF_PROXY_URL}/animekai/health`);
  
  try {
    const response = await fetch(`${CF_PROXY_URL}/animekai/health`);
    console.log(`\nStatus: ${response.status}`);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.rpiProxy?.configured) {
      console.log('\n✓ RPI proxy is configured!');
    } else {
      console.log('\n✗ RPI proxy is NOT configured!');
      console.log('  Set RPI_PROXY_URL and RPI_PROXY_KEY secrets in Cloudflare Worker');
      console.log('  Run: wrangler secret put RPI_PROXY_URL');
      console.log('  Run: wrangler secret put RPI_PROXY_KEY');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHealth();
