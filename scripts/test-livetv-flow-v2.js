/**
 * Test LiveTV Stream Flow
 * 
 * This tests the full flow:
 * 1. Call /api/livetv/xfinity-stream to get a CF proxy URL
 * 2. Verify the URL format is correct (CF proxy with url/mac params)
 * 3. Test that the CF proxy responds correctly
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function testLiveTVFlow() {
  console.log('=== Testing LiveTV Stream Flow ===\n');
  
  // Test channel - ESPN
  const channelId = 'espn';
  
  console.log(`1. Fetching stream URL for channel: ${channelId}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/livetv/xfinity-stream?channelId=${channelId}`);
    const data = await response.json();
    
    console.log('   Response status:', response.status);
    console.log('   Success:', data.success);
    
    if (!data.success) {
      console.log('   Error:', data.error);
      return;
    }
    
    console.log('   Stream URL:', data.streamUrl?.substring(0, 100) + '...');
    console.log('   Channel:', data.channel?.name);
    
    // Verify URL format
    const streamUrl = data.streamUrl;
    const isCorrectFormat = streamUrl.startsWith(CF_PROXY_URL) && 
                            streamUrl.includes('/iptv/stream?') &&
                            streamUrl.includes('url=') &&
                            streamUrl.includes('mac=');
    
    console.log('\n2. Verifying URL format');
    console.log('   Starts with CF proxy:', streamUrl.startsWith(CF_PROXY_URL));
    console.log('   Has /iptv/stream path:', streamUrl.includes('/iptv/stream?'));
    console.log('   Has url param:', streamUrl.includes('url='));
    console.log('   Has mac param:', streamUrl.includes('mac='));
    console.log('   Format correct:', isCorrectFormat);
    
    if (!isCorrectFormat) {
      console.log('\n   ERROR: URL format is incorrect!');
      console.log('   Expected format: ${CF_PROXY_URL}/iptv/stream?url=...&mac=...');
      return;
    }
    
    // Test CF proxy responds
    console.log('\n3. Testing CF proxy response (HEAD request)');
    
    const proxyResponse = await fetch(streamUrl, { method: 'HEAD' });
    console.log('   Proxy status:', proxyResponse.status);
    console.log('   Content-Type:', proxyResponse.headers.get('content-type'));
    
    if (proxyResponse.status === 200) {
      console.log('\n   SUCCESS! Stream is accessible.');
    } else if (proxyResponse.status === 403 || proxyResponse.status === 458) {
      console.log('\n   WARNING: Stream returned', proxyResponse.status);
      console.log('   This may indicate the IPTV account is blocked or token expired.');
      console.log('   The frontend will auto-retry with a different account.');
    } else {
      console.log('\n   Unexpected status:', proxyResponse.status);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLiveTVFlow();
