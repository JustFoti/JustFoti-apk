/**
 * Test stream-proxy directly with a known shadowlands URL
 */

async function testProxyDirectly() {
  console.log('🔥 TESTING STREAM-PROXY DIRECTLY 🔥\n');
  
  // Use a known shadowlands URL format (even if expired, we can test proxy behavior)
  const testUrl = 'https://tmstr2.shadowlandschronicles.com/pl/H4sIAAAAAAAAAw3J25KCIBgA4FfCA5Z7aR7KkhkRfpI7EBtPsLXjrOXT7363nzn4cW_C4PFAKvI9FUX6iHWPtD4cAi_CXx3In8q.iUY1Nmn5roR8sWn4ZchzLIu_aZZtushZa2HsROeL2TgyccQcSTtYTq1PQzNLogsDDP5_XE9NwDflJSkvVk59cukL0yobfiQMoXaS9ecEabsmsA9l45arcUvGWRKqpQ1bkGmVYQWOSL2Xz4rjVBaLkHbDJE2AIQodj0.QJ6K5l7sQOLiiZwPn597YBTMvr3l.wfCJb2o84m6iWT3RF53zMynkRoOS13c5SIR3YdfgD5oPiRwhAQAA/master.m3u8';
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9'
  };
  
  console.log('🎯 Testing shadowlands URL through proxy...');
  console.log(`📺 Test URL: ${testUrl.substring(0, 80)}...`);
  
  const proxyUrl = `http://localhost:3000/api/stream-proxy?url=${encodeURIComponent(testUrl)}&source=shadowlands`;
  
  try {
    console.log('\n🌐 Making request to proxy...');
    const response = await fetch(proxyUrl, { headers });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Content-Type: ${response.headers.get('content-type')}`);
    console.log(`📏 Content-Length: ${response.headers.get('content-length')}`);
    
    // Get response body
    const responseText = await response.text();
    console.log(`📋 Response Length: ${responseText.length}`);
    
    if (response.status === 404) {
      console.log('✅ PROXY IS WORKING! Got expected 404 from expired URL');
      console.log('📄 Response preview:', responseText.substring(0, 200));
    } else if (response.status === 200) {
      console.log('✅ PROXY IS WORKING! Got successful response');
      console.log('📄 Response preview:', responseText.substring(0, 200));
    } else if (response.status >= 500) {
      console.log('❌ PROXY HAS SERVER ERROR!');
      console.log('📄 Error response:', responseText);
    } else {
      console.log(`🤔 Unexpected status: ${response.status}`);
      console.log('📄 Response:', responseText.substring(0, 300));
    }
    
  } catch (error) {
    console.log(`💥 PROXY REQUEST FAILED: ${error.message}`);
  }
  
  // Test 2: Test with a simple HTTP URL to verify proxy basics
  console.log('\n🎯 Testing proxy with simple HTTP URL...');
  const simpleUrl = 'https://httpbin.org/status/200';
  const simpleProxyUrl = `http://localhost:3000/api/stream-proxy?url=${encodeURIComponent(simpleUrl)}&source=test`;
  
  try {
    const simpleResponse = await fetch(simpleProxyUrl, { headers });
    console.log(`📊 Simple URL Status: ${simpleResponse.status} ${simpleResponse.statusText}`);
    
    if (simpleResponse.ok) {
      console.log('✅ PROXY BASIC FUNCTIONALITY WORKS!');
    } else {
      console.log('❌ PROXY BASIC FUNCTIONALITY BROKEN!');
      const errorText = await simpleResponse.text();
      console.log('📄 Error:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.log(`💥 SIMPLE PROXY TEST FAILED: ${error.message}`);
  }
  
  console.log('\n🎯 PROXY TEST COMPLETED - Check server logs for detailed behavior');
}

testProxyDirectly().catch(console.error);