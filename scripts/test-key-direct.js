#!/usr/bin/env node
// Test encrypted channel key fetch

async function test() {
  const channel = '366'; // Sky Sports News - uses dvalna.ru with encryption
  const headers = {
    'Origin': 'https://flyx.tv',
    'Referer': 'https://flyx.tv/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
  
  console.log('=== Testing encrypted channel', channel, '===\n');
  
  // Get M3U8
  console.log('1. Fetching M3U8...');
  const controller1 = new AbortController();
  setTimeout(() => controller1.abort(), 30000);
  
  const res = await fetch(`https://media-proxy.vynx.workers.dev/tv?channel=${channel}`, { 
    headers,
    signal: controller1.signal 
  });
  const m3u8 = await res.text();
  console.log('   Status:', res.status);
  
  if (res.status !== 200) {
    console.log('   Error:', m3u8);
    return;
  }
  
  // Find key URL
  const keyMatch = m3u8.match(/URI="([^"]+key[^"]+)"/i);
  if (!keyMatch) {
    console.log('   No key URL found');
    console.log('   M3U8:', m3u8);
    return;
  }
  
  const keyUrl = keyMatch[1];
  console.log('   Key URL:', keyUrl);
  
  // Fetch key
  console.log('\n2. Fetching key...');
  const controller2 = new AbortController();
  setTimeout(() => controller2.abort(), 20000);
  
  const keyRes = await fetch(keyUrl, { headers, signal: controller2.signal });
  console.log('   Status:', keyRes.status);
  console.log('   Headers:', Object.fromEntries(keyRes.headers.entries()));
  
  if (keyRes.ok) {
    const keyData = await keyRes.arrayBuffer();
    console.log('   Size:', keyData.byteLength, 'bytes');
    
    if (keyData.byteLength === 16) {
      const hex = Array.from(new Uint8Array(keyData)).map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('   ✅ Valid 16-byte key:', hex);
    } else {
      const text = new TextDecoder().decode(keyData);
      console.log('   ❌ Invalid key response:', text.substring(0, 500));
    }
  } else {
    const errText = await keyRes.text();
    console.log('   ❌ Key fetch failed:', errText);
  }
  
  // Also test a segment
  console.log('\n3. Testing segment...');
  const segMatch = m3u8.match(/(https:\/\/[^\s]+\.ts)/);
  if (segMatch) {
    const segUrl = segMatch[1];
    console.log('   Segment URL:', segUrl.substring(0, 80) + '...');
    
    const segRes = await fetch(segUrl, { headers });
    console.log('   Status:', segRes.status);
    
    if (segRes.ok) {
      const segData = await segRes.arrayBuffer();
      console.log('   Size:', segData.byteLength, 'bytes');
      if (segData.byteLength > 10000) {
        console.log('   ✅ Segment looks valid!');
      }
    } else {
      console.log('   ❌ Segment failed:', await segRes.text());
    }
  }
}

test().catch(e => console.error('Error:', e));
