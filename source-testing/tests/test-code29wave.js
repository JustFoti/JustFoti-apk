/**
 * Test what headers code29wave.site requires
 * Run from your Pi: node test-code29wave.js
 */

const https = require('https');
const http = require('http');

// Test URL from the logs
const TEST_URL = 'https://rrr.code29wave.site/pz78/c5/h6a90f70b8d237f94866b6cfc246349bddedc7dc1328a917ca76e37756fa661eea100899eb0e27ac0c102a43593daa3423043341b3a9c0feb0784d09d53a146e35d/list,Ktm0Vt9-cJyXbGG_O3gV_5vGK-kpiQ.m3u8';

async function testWithHeaders(name, headers) {
  return new Promise((resolve) => {
    const url = new URL(TEST_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers,
      timeout: 10000,
      rejectUnauthorized: false,
    };

    console.log(`\n=== Testing: ${name} ===`);
    console.log('Headers:', JSON.stringify(headers, null, 2));

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response headers:`, res.headers);
        if (res.statusCode === 200) {
          console.log(`✓ SUCCESS! First 200 chars: ${data.substring(0, 200)}`);
        } else {
          console.log(`✗ FAILED! Body: ${data.substring(0, 500)}`);
        }
        resolve({ name, status: res.statusCode, success: res.statusCode === 200 });
      });
    });

    req.on('error', (err) => {
      console.log(`✗ ERROR: ${err.message}`);
      resolve({ name, status: 0, success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`✗ TIMEOUT`);
      resolve({ name, status: 0, success: false, error: 'timeout' });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing code29wave.site with different header combinations...\n');
  console.log('URL:', TEST_URL.substring(0, 80) + '...');
  
  const results = [];

  // Test 1: No headers at all
  results.push(await testWithHeaders('No headers', {}));

  // Test 2: Just User-Agent
  results.push(await testWithHeaders('Just User-Agent', {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }));

  // Test 3: User-Agent + Accept
  results.push(await testWithHeaders('UA + Accept', {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
  }));

  // Test 4: With Referer from same domain
  results.push(await testWithHeaders('With same-domain Referer', {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://rrr.code29wave.site/',
  }));

  // Test 5: With Referer from megaup
  results.push(await testWithHeaders('With megaup Referer', {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://megaup22.online/',
  }));

  // Test 6: With Origin header (should fail)
  results.push(await testWithHeaders('With Origin (should fail)', {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Origin': 'https://animekai.to',
  }));

  // Test 7: Full browser-like headers
  results.push(await testWithHeaders('Full browser headers', {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  }));

  // Test 8: Minimal with Range header (for HLS)
  results.push(await testWithHeaders('With Range header', {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Range': 'bytes=0-',
  }));

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  for (const r of results) {
    console.log(`${r.success ? '✓' : '✗'} ${r.name}: ${r.status}`);
  }
  
  const working = results.filter(r => r.success);
  if (working.length > 0) {
    console.log(`\n✓ Working configurations: ${working.map(r => r.name).join(', ')}`);
  } else {
    console.log('\n✗ No configuration worked! The URL might be expired or IP-blocked.');
  }
}

runTests().catch(console.error);
