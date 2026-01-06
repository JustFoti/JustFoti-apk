/**
 * Test if Hetzner VPS can access poocloud.in (PPV.to streams)
 * 
 * Usage: node scripts/test-hetzner-ppv.js
 * 
 * Set your Hetzner proxy URL and key below or via env vars
 */

const https = require('https');
const http = require('http');

// ============================================
// CONFIGURE YOUR HETZNER PROXY HERE
// ============================================
const HETZNER_PROXY_URL = process.env.HETZNER_PROXY_URL || 'https://your-hetzner-proxy.com';
const HETZNER_PROXY_KEY = process.env.HETZNER_PROXY_KEY || 'your-api-key';

// PPV test URLs
const TEST_URL = 'https://gg.poocloud.in/familyguy/index.m3u8';
const REFERER = 'https://modistreams.org/';

async function testHetzner() {
  console.log('='.repeat(60));
  console.log('Testing Hetzner VPS access to poocloud.in');
  console.log('='.repeat(60));
  console.log(`Hetzner Proxy: ${HETZNER_PROXY_URL}`);
  console.log(`Test URL: ${TEST_URL}`);
  console.log('');

  if (HETZNER_PROXY_URL.includes('your-hetzner')) {
    console.log('⚠️  Please set your Hetzner proxy URL!');
    console.log('   Edit this file or set env vars:');
    console.log('   HETZNER_PROXY_URL=xxx HETZNER_PROXY_KEY=xxx node scripts/test-hetzner-ppv.js');
    return;
  }

  // Test 1: Health check
  console.log('-'.repeat(60));
  console.log('Test 1: Hetzner Health Check');
  try {
    const healthUrl = `${HETZNER_PROXY_URL}/health`;
    const healthRes = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
    const healthData = await healthRes.json();
    console.log(`  Status: ${healthRes.status}`);
    console.log(`  Response:`, healthData);
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    console.log('  ❌ Hetzner proxy not reachable!');
    return;
  }

  // Test 2: Fetch poocloud.in m3u8 via Hetzner /ppv endpoint (correct endpoint for PPV)
  console.log('');
  console.log('-'.repeat(60));
  console.log('Test 2: Fetch poocloud.in via Hetzner /ppv');
  try {
    const params = new URLSearchParams({
      url: TEST_URL,
      key: HETZNER_PROXY_KEY,
    });
    const streamUrl = `${HETZNER_PROXY_URL}/ppv?${params.toString()}`;
    console.log(`  Request: ${streamUrl.substring(0, 100)}...`);
    
    const res = await fetch(streamUrl, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    
    console.log(`  Status: ${res.status}`);
    console.log(`  Headers:`, Object.fromEntries(res.headers.entries()));
    
    if (res.status === 200 && text.includes('#EXTM3U')) {
      console.log('  ✅ SUCCESS! Got valid M3U8 playlist');
      console.log('');
      console.log('  Playlist preview:');
      console.log(text.split('\n').slice(0, 15).map(l => '    ' + l).join('\n'));
      
      // Extract segment URLs
      const segments = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (segments.length > 0) {
        console.log('');
        console.log('  Segment URLs:');
        segments.slice(0, 3).forEach(s => console.log(`    ${s}`));
      }
    } else {
      console.log(`  ❌ Failed or blocked`);
      console.log(`  Response: ${text.substring(0, 300)}`);
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  // Test 3: Check what IP Hetzner sees
  console.log('');
  console.log('-'.repeat(60));
  console.log('Test 3: Check Hetzner external IP');
  try {
    // Use a simple IP check service through Hetzner
    const params = new URLSearchParams({
      url: 'https://api.ipify.org?format=json',
      key: HETZNER_PROXY_KEY,
    });
    const ipUrl = `${HETZNER_PROXY_URL}/stream?${params.toString()}`;
    const res = await fetch(ipUrl, { signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    console.log(`  Hetzner external IP: ${text}`);
  } catch (err) {
    console.log(`  Error checking IP: ${err.message}`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log('- If Test 2 shows ✅ = Hetzner can access poocloud.in');
  console.log('- If Test 2 shows 403/1006 = Hetzner IP is also banned');
  console.log('='.repeat(60));
}

testHetzner().catch(console.error);
