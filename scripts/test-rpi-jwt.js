#!/usr/bin/env node
// Test RPI proxy JWT fetch

const RPI_URL = 'https://rpi-proxy.vynx.cc';
const KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

async function test() {
  // Test fetching JWT via RPI /animekai endpoint
  const playerUrl = 'https://topembed.pw/channel/SkySportsNews[UK]';
  const rpiUrl = `${RPI_URL}/animekai?url=${encodeURIComponent(playerUrl)}&key=${KEY}&referer=${encodeURIComponent('https://dlhd.link/')}`;
  
  console.log('Testing RPI /animekai endpoint...');
  console.log('URL:', rpiUrl.substring(0, 100));
  
  const start = Date.now();
  try {
    const res = await fetch(rpiUrl, { signal: AbortSignal.timeout(10000) });
    console.log('Status:', res.status, 'Time:', Date.now() - start, 'ms');
    
    if (res.ok) {
      const html = await res.text();
      console.log('Response length:', html.length);
      
      // Look for JWT
      const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (jwtMatch) {
        console.log('✅ Found JWT:', jwtMatch[0].substring(0, 50) + '...');
        
        // Decode it
        const payloadB64 = jwtMatch[0].split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
        console.log('JWT payload:', payload);
      } else {
        console.log('❌ No JWT found in response');
        console.log('Response preview:', html.substring(0, 500));
      }
    } else {
      const text = await res.text();
      console.log('Error:', text.substring(0, 300));
    }
  } catch (e) {
    console.log('Error:', e.message, 'Time:', Date.now() - start, 'ms');
  }
}

test().catch(console.error);
