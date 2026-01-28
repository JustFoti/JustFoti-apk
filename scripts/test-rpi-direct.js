#!/usr/bin/env node
// Test RPI proxy directly

const RPI_URL = process.env.RPI_PROXY_URL || 'https://rpi-proxy.vynx.cc';

async function test() {
  console.log('Testing RPI proxy at:', RPI_URL);
  
  // Test health
  console.log('\n1. Testing /health...');
  try {
    const healthRes = await fetch(`${RPI_URL}/health`, { signal: AbortSignal.timeout(5000) });
    console.log('   Status:', healthRes.status);
    const healthText = await healthRes.text();
    console.log('   Response:', healthText.substring(0, 200));
  } catch (e) {
    console.log('   Error:', e.message);
  }
  
  // Test dlhd-key-v4 endpoint with dummy data
  console.log('\n2. Testing /dlhd-key-v4 (missing params)...');
  try {
    const res = await fetch(`${RPI_URL}/dlhd-key-v4`, { signal: AbortSignal.timeout(5000) });
    console.log('   Status:', res.status);
    const text = await res.text();
    console.log('   Response:', text.substring(0, 200));
  } catch (e) {
    console.log('   Error:', e.message);
  }
  
  // Test with actual key URL
  console.log('\n3. Testing /dlhd-key-v4 with test params...');
  const testUrl = `${RPI_URL}/dlhd-key-v4?url=https://chevy.dvalna.ru/key/skysportsnews/12345&jwt=test&timestamp=123&nonce=456`;
  try {
    const res = await fetch(testUrl, { signal: AbortSignal.timeout(10000) });
    console.log('   Status:', res.status);
    const text = await res.text();
    console.log('   Response:', text.substring(0, 300));
  } catch (e) {
    console.log('   Error:', e.message);
  }
}

test().catch(console.error);
