#!/usr/bin/env node
/**
 * Debug: Check what the RPi proxy actually receives when streaming
 */

const RPI_PROXY_URL = 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

// Test with a known working stream URL format
const TEST_STREAM_URL = 'http://skunkytv.live:80/play/live.php?mac=00:1A:79:00:00:0C&stream=987841&extension=ts&play_token=test123';
const TEST_MAC = '00:1A:79:00:00:0C';

async function test() {
  console.log('Testing RPi proxy stream endpoint...\n');
  
  // Test 1: Check if RPi can reach the portal at all
  console.log('1. Testing if RPi can reach portal...');
  const testParams = new URLSearchParams({
    url: 'http://skunkytv.live/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml',
    mac: TEST_MAC,
    key: RPI_PROXY_KEY,
  });
  
  const testRes = await fetch(`${RPI_PROXY_URL}/iptv/api?${testParams}`);
  console.log(`  Status: ${testRes.status}`);
  const testText = await testRes.text();
  console.log(`  Response: ${testText.substring(0, 150)}...`);
  
  // Test 2: Try streaming with verbose output
  console.log('\n2. Testing stream endpoint...');
  const streamParams = new URLSearchParams({
    url: TEST_STREAM_URL,
    mac: TEST_MAC,
    key: RPI_PROXY_KEY,
  });
  
  console.log(`  URL: ${RPI_PROXY_URL}/iptv/stream?${streamParams}`);
  
  const streamRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  
  console.log(`  Status: ${streamRes.status}`);
  console.log(`  Headers:`);
  for (const [key, value] of streamRes.headers.entries()) {
    console.log(`    ${key}: ${value}`);
  }
  
  const body = await streamRes.text();
  console.log(`  Body (first 500 chars): ${body.substring(0, 500)}`);
}

test().catch(console.error);
