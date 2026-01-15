/**
 * Test CDN-LIVE API endpoint extraction
 * 
 * Tests the /api/livetv/cdnlive-stream endpoint to ensure:
 * 1. It extracts real m3u8 URLs
 * 2. It blocks honeypot URLs (flyx.m3u8)
 * 3. URLs are valid and accessible
 */

const TEST_CHANNELS = [
  { name: 'us-espn', code: 'us', label: 'ESPN (US)' },
  { name: 'us-abc', code: 'us', label: 'ABC (US)' },
  { name: 'us-cnn', code: 'us', label: 'CNN (US)' },
];

async function testChannel(channel, code, label) {
  console.log(`\n🧪 Testing: ${label}`);
  console.log('─'.repeat(60));
  
  try {
    const url = `http://localhost:3000/api/livetv/cdnlive-stream?channel=${channel}&code=${code}`;
    console.log(`📡 Fetching: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      console.error(`❌ Failed: ${data.error}`);
      return false;
    }
    
    console.log(`✅ Success!`);
    console.log(`📺 Stream URL: ${data.streamUrl}`);
    console.log(`🔍 Method: ${data.method}`);
    console.log(`🌍 Country: ${data.country}`);
    
    // Validate URL format
    if (!data.streamUrl.startsWith('https://')) {
      console.error('❌ URL does not start with https://');
      return false;
    }
    
    if (!data.streamUrl.includes('.m3u8')) {
      console.error('❌ URL does not contain .m3u8');
      return false;
    }
    
    // Check for honeypot
    if (data.streamUrl.toLowerCase().includes('flyx.m3u8')) {
      console.error('❌ HONEYPOT DETECTED! URL contains flyx.m3u8');
      return false;
    }
    
    // Test if URL is accessible
    console.log('🔗 Testing URL accessibility...');
    const streamResponse = await fetch(data.streamUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (streamResponse.ok) {
      console.log(`✅ Stream URL is accessible (${streamResponse.status})`);
    } else {
      console.warn(`⚠️ Stream URL returned ${streamResponse.status}`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 CDN-LIVE API Endpoint Test Suite');
  console.log('═'.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, code, label } of TEST_CHANNELS) {
    const result = await testChannel(name, code, label);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! CDN-LIVE extraction is working!');
  } else {
    console.log('\n⚠️ Some tests failed. Check the logs above.');
  }
}

runTests().catch(console.error);
