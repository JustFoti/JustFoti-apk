/**
 * Test the Cloudflare Worker VIPRow proxy
 * 
 * Run: node scripts/test-cf-viprow.js
 * 
 * Requires: NEXT_PUBLIC_CF_STREAM_PROXY_URL environment variable
 */

const CF_PROXY_URL = process.env.NEXT_PUBLIC_CF_STREAM_PROXY_URL;

if (!CF_PROXY_URL) {
  console.error('ERROR: NEXT_PUBLIC_CF_STREAM_PROXY_URL is not set');
  console.log('Set it to your Cloudflare Worker URL, e.g.:');
  console.log('  export NEXT_PUBLIC_CF_STREAM_PROXY_URL=https://media-proxy.your-domain.workers.dev/stream');
  process.exit(1);
}

// Strip /stream suffix if present
const baseUrl = CF_PROXY_URL.replace(/\/stream\/?$/, '');

async function testVIPRowProxy() {
  console.log('=== Testing Cloudflare VIPRow Proxy ===\n');
  console.log('Base URL:', baseUrl);
  
  // Test 1: Health check
  console.log('\n--- Test 1: Health Check ---');
  try {
    const healthRes = await fetch(`${baseUrl}/viprow/health`);
    const healthData = await healthRes.json();
    console.log('Status:', healthRes.status);
    console.log('Response:', JSON.stringify(healthData, null, 2));
  } catch (err) {
    console.log('ERROR:', err.message);
  }
  
  // Test 2: Stream extraction
  console.log('\n--- Test 2: Stream Extraction ---');
  const testEventUrl = '/atp-tour/united-cup-2026-day-5-online-stream';
  const streamUrl = `${baseUrl}/viprow/stream?url=${encodeURIComponent(testEventUrl)}&link=1`;
  console.log('Request URL:', streamUrl);
  
  try {
    const streamRes = await fetch(streamUrl);
    console.log('Status:', streamRes.status);
    console.log('Content-Type:', streamRes.headers.get('content-type'));
    
    if (streamRes.ok) {
      const text = await streamRes.text();
      console.log('\n✅ SUCCESS! Got m3u8 manifest:');
      console.log(text.substring(0, 800));
      
      // Check if URLs are rewritten
      if (text.includes('/viprow/key') && text.includes('/viprow/segment')) {
        console.log('\n✅ URLs are properly rewritten through proxy!');
      } else {
        console.log('\n⚠️ URLs may not be rewritten correctly');
      }
    } else {
      const errorText = await streamRes.text();
      console.log('ERROR Response:', errorText);
    }
  } catch (err) {
    console.log('ERROR:', err.message);
  }
  
  console.log('\n=== Test Complete ===');
}

testVIPRowProxy().catch(console.error);
