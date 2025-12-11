/**
 * Test the LiveTV stream flow end-to-end
 * 
 * This tests:
 * 1. /api/livetv/xfinity-stream - Gets stream URL (now returns Next.js proxy URL)
 * 2. /api/livetv/stream - Proxies and rewrites M3U8 playlists
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_CHANNEL = 'espn'; // A common channel to test

async function testXfinityStream() {
  console.log('\n=== Testing /api/livetv/xfinity-stream ===');
  console.log(`Channel: ${TEST_CHANNEL}`);
  
  const url = `${BASE_URL}/api/livetv/xfinity-stream?channelId=${TEST_CHANNEL}`;
  console.log(`URL: ${url}`);
  
  const response = await fetch(url);
  const data = await response.json();
  
  console.log('Response status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  
  if (!data.success) {
    console.error('❌ Failed to get stream URL');
    return null;
  }
  
  // Verify the URL goes through our Next.js proxy
  if (data.streamUrl.includes('/api/livetv/stream')) {
    console.log('✅ Stream URL correctly routes through Next.js proxy');
  } else {
    console.error('❌ Stream URL does NOT route through Next.js proxy!');
    console.error('   Expected: /api/livetv/stream?...');
    console.error('   Got:', data.streamUrl.substring(0, 100));
  }
  
  return data.streamUrl;
}

async function testStreamProxy(streamUrl) {
  console.log('\n=== Testing /api/livetv/stream (M3U8 proxy) ===');
  
  if (!streamUrl) {
    console.log('Skipping - no stream URL');
    return;
  }
  
  // The streamUrl is already a full URL to our proxy
  console.log(`Fetching: ${streamUrl.substring(0, 100)}...`);
  
  const response = await fetch(streamUrl);
  const contentType = response.headers.get('content-type');
  
  console.log('Response status:', response.status);
  console.log('Content-Type:', contentType);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Stream proxy failed:', errorText.substring(0, 200));
    return;
  }
  
  const content = await response.text();
  console.log('Content length:', content.length);
  console.log('First 500 chars:\n', content.substring(0, 500));
  
  // Check if M3U8 was rewritten
  if (content.includes('#EXTM3U')) {
    console.log('✅ Valid M3U8 playlist received');
    
    // Check if URLs are rewritten to go through our proxy
    if (content.includes('/api/livetv/stream?')) {
      console.log('✅ Segment URLs are rewritten to use our proxy');
    } else if (content.includes('http://') || content.includes('https://')) {
      console.error('❌ Segment URLs are NOT rewritten - still pointing to original server!');
    } else {
      console.log('⚠️ No absolute URLs found - might be relative or empty playlist');
    }
  } else {
    console.log('⚠️ Response is not an M3U8 playlist');
  }
}

async function main() {
  console.log('LiveTV Stream Flow Test');
  console.log('========================');
  console.log(`Base URL: ${BASE_URL}`);
  
  try {
    const streamUrl = await testXfinityStream();
    await testStreamProxy(streamUrl);
    
    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();
