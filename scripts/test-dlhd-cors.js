/**
 * Test DLHD CDN endpoints to determine what needs proxying
 * Tests: server_lookup, M3U8, key, segments
 */

const channel = '769';
const channelKey = `premium${channel}`;

async function testEndpoint(name, url, headers = {}) {
  console.log(`\n=== Testing ${name} ===`);
  console.log(`URL: ${url}`);
  
  try {
    // Test WITHOUT special headers (simulates browser)
    console.log('\n1. Without headers (browser simulation):');
    const res1 = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
    });
    console.log(`   Status: ${res1.status}`);
    console.log(`   CORS headers:`);
    console.log(`     Access-Control-Allow-Origin: ${res1.headers.get('access-control-allow-origin') || 'NONE'}`);
    console.log(`     Access-Control-Allow-Methods: ${res1.headers.get('access-control-allow-methods') || 'NONE'}`);
    
    // Test WITH special headers (simulates proxy)
    console.log('\n2. With Referer/Origin headers:');
    const res2 = await fetch(url, { headers });
    console.log(`   Status: ${res2.status}`);
    
    const contentType = res2.headers.get('content-type');
    const contentLength = res2.headers.get('content-length');
    console.log(`   Content-Type: ${contentType}`);
    console.log(`   Content-Length: ${contentLength}`);
    
    // Check if content is valid
    if (res2.ok) {
      if (contentType?.includes('json')) {
        const json = await res2.json();
        console.log(`   Response: ${JSON.stringify(json)}`);
      } else if (contentType?.includes('mpegurl') || url.includes('mono.css')) {
        const text = await res2.text();
        console.log(`   Valid M3U8: ${text.includes('#EXTM3U')}`);
        console.log(`   Has key: ${text.includes('EXT-X-KEY')}`);
        // Extract key URL
        const keyMatch = text.match(/URI="([^"]+)"/);
        if (keyMatch) return { keyUrl: keyMatch[1], m3u8: text };
      } else {
        const buffer = await res2.arrayBuffer();
        console.log(`   Binary data: ${buffer.byteLength} bytes`);
      }
    }
    
    return { status: res1.status, cors: res1.headers.get('access-control-allow-origin') };
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
    return { error: err.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('DLHD CORS/Header Requirements Test');
  console.log('='.repeat(60));

  const playerDomain = 'epicplayplay.cfd';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    'Referer': `https://${playerDomain}/`,
    'Origin': `https://${playerDomain}`,
  };

  // 1. Server lookup
  await testEndpoint(
    'Server Lookup',
    `https://${playerDomain}/server_lookup.js?channel_id=${channelKey}`,
    headers
  );

  // 2. M3U8 playlist
  const m3u8Result = await testEndpoint(
    'M3U8 Playlist',
    `https://zekonew.giokko.ru/zeko/${channelKey}/mono.css`,
    headers
  );

  // 3. Key endpoint
  if (m3u8Result?.keyUrl) {
    await testEndpoint('Decryption Key', m3u8Result.keyUrl, headers);
  }

  // 4. Segment (extract from M3U8)
  if (m3u8Result?.m3u8) {
    const segmentMatch = m3u8Result.m3u8.match(/https:\/\/whalesignal\.ai\/[^\s]+/);
    if (segmentMatch) {
      await testEndpoint('Video Segment', segmentMatch[0], headers);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY - What needs proxying:');
  console.log('='.repeat(60));
  console.log(`
Based on CORS headers:
- If "Access-Control-Allow-Origin: *" → Browser can fetch directly
- If "Access-Control-Allow-Origin: NONE" → Must be proxied
- If requires Referer/Origin headers → Must be proxied
`);
}

main().catch(console.error);
