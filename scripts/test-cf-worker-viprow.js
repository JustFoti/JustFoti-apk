/**
 * Test the Cloudflare Worker VIPRow endpoint
 */

const https = require('https');

const CF_WORKER_URL = 'https://media-proxy.vynx.workers.dev';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function testWorker() {
  console.log('=== Testing Cloudflare Worker VIPRow Endpoint ===\n');
  
  // Test health endpoint
  console.log('1. Testing health endpoint...');
  try {
    const healthRes = await fetchUrl(`${CF_WORKER_URL}/viprow/health`);
    console.log('   Status:', healthRes.status);
    console.log('   Response:', healthRes.data);
  } catch (e) {
    console.log('   Error:', e.message);
  }
  
  // Test stream extraction with a known event
  console.log('\n2. Testing stream extraction...');
  const testUrl = '/atp-tour/united-cup-2026-day-5-online-stream';
  const streamEndpoint = `${CF_WORKER_URL}/viprow/stream?url=${encodeURIComponent(testUrl)}&link=1`;
  console.log('   URL:', streamEndpoint);
  
  try {
    const streamRes = await fetchUrl(streamEndpoint);
    console.log('   Status:', streamRes.status);
    console.log('   Content-Type:', streamRes.headers['content-type']);
    
    if (streamRes.status === 200) {
      console.log('   Response (first 500 chars):');
      console.log(streamRes.data.substring(0, 500));
    } else {
      console.log('   Error Response:', streamRes.data);
    }
  } catch (e) {
    console.log('   Error:', e.message);
  }
  
  // Test with WWE event (the one from the error)
  console.log('\n3. Testing WWE event (from error log)...');
  const wweUrl = '/wwe/monday-night-raw-online-stream';
  const wweEndpoint = `${CF_WORKER_URL}/viprow/stream?url=${encodeURIComponent(wweUrl)}&link=1`;
  console.log('   URL:', wweEndpoint);
  
  try {
    const wweRes = await fetchUrl(wweEndpoint);
    console.log('   Status:', wweRes.status);
    console.log('   Content-Type:', wweRes.headers['content-type']);
    
    if (wweRes.status === 200) {
      console.log('   Response (first 500 chars):');
      console.log(wweRes.data.substring(0, 500));
    } else {
      console.log('   Error Response:', wweRes.data);
    }
  } catch (e) {
    console.log('   Error:', e.message);
  }
}

testWorker().catch(console.error);
