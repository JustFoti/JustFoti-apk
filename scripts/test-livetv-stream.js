/**
 * Test LiveTV stream flow
 * Run: node scripts/test-livetv-stream.js
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

// Test channel - ESPN
const TEST_CHANNEL = 'espn';

async function testStream() {
  console.log('=== Testing LiveTV Stream Flow ===\n');
  
  // Step 1: Call the xfinity-stream API
  console.log(`1. Requesting stream for channel: ${TEST_CHANNEL}`);
  
  try {
    const apiUrl = `http://localhost:3000/api/livetv/xfinity-stream?channelId=${TEST_CHANNEL}`;
    console.log(`   URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (!data.success) {
      console.log('\n❌ API returned error:', data.error);
      return;
    }
    
    console.log('\n2. Got stream URL:', data.streamUrl);
    
    // Check if it's TS or M3U8
    const isM3U8 = data.streamUrl.includes('extension=m3u8') || data.streamUrl.includes('extension%3Dm3u8');
    console.log(`   Format: ${isM3U8 ? 'M3U8 (HLS)' : 'TS (MPEG-TS)'}`);
    
    // Step 2: Try to fetch the stream
    console.log('\n3. Testing stream URL...');
    const streamResponse = await fetch(data.streamUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
    });
    
    console.log(`   Stream Status: ${streamResponse.status}`);
    console.log(`   Content-Type: ${streamResponse.headers.get('content-type')}`);
    
    if (streamResponse.ok) {
      const contentType = streamResponse.headers.get('content-type') || '';
      const text = await streamResponse.text();
      
      if (contentType.includes('mpegurl') || text.startsWith('#EXTM3U')) {
        console.log('\n✅ Stream is HLS M3U8 playlist!');
        console.log('   First 500 chars:', text.substring(0, 500));
      } else if (contentType.includes('mp2t') || contentType.includes('video')) {
        console.log('\n✅ Stream is MPEG-TS (binary video data)');
        console.log('   Content length:', text.length, 'bytes');
      } else {
        console.log('\n⚠️ Unexpected content type. Response:', text.substring(0, 500));
      }
    } else {
      const errorText = await streamResponse.text();
      console.log('\n❌ Stream fetch failed:', errorText);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testStream();
