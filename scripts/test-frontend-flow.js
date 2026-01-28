/**
 * Test the full frontend flow for Live TV
 * Simulates what the browser does when loading a channel
 */

const CF_URL = 'https://media-proxy.vynx.workers.dev';

async function testFrontendFlow(channelId, channelName) {
  console.log(`\n=== Testing ${channelId}: ${channelName} ===`);
  
  // Step 1: Fetch M3U8 playlist (what useVideoPlayer does)
  const playlistUrl = `${CF_URL}/tv?channel=${channelId}`;
  console.log('1. Fetching playlist:', playlistUrl);
  
  const start = Date.now();
  try {
    const res = await fetch(playlistUrl, {
      headers: {
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/',
      },
      signal: AbortSignal.timeout(20000),
    });
    
    if (!res.ok) {
      console.log(`   ❌ HTTP ${res.status}`);
      return false;
    }
    
    const text = await res.text();
    const m3u8Time = Date.now() - start;
    
    if (!text.startsWith('#EXTM3U')) {
      console.log(`   ❌ Not M3U8 response`);
      return false;
    }
    
    console.log(`   ✅ M3U8 received (${m3u8Time}ms, ${text.length} bytes)`);
    
    // Step 2: Check for encryption key
    const keyMatch = text.match(/#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/);
    if (!keyMatch) {
      console.log('   ℹ️  No encryption (cdn-live backend)');
      return true;
    }
    
    // Step 3: Fetch the key (what hls.js does)
    const keyUrl = keyMatch[1];
    console.log('2. Fetching key:', keyUrl.substring(0, 60) + '...');
    
    const keyStart = Date.now();
    const keyRes = await fetch(keyUrl, {
      headers: {
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/',
      },
      signal: AbortSignal.timeout(20000),
    });
    
    const keyData = await keyRes.arrayBuffer();
    const keyTime = Date.now() - keyStart;
    
    if (keyData.byteLength === 16) {
      console.log(`   ✅ Key received (${keyTime}ms, 16 bytes)`);
      return true;
    } else {
      const keyText = new TextDecoder().decode(keyData);
      console.log(`   ❌ Invalid key: ${keyText.substring(0, 100)}`);
      return false;
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('Frontend Flow Test - Simulating browser behavior\n');
  
  const channels = [
    ['35', 'Sky Sports Football'],
    ['44', 'ESPN'],
    ['366', 'Sky Sports News'],
    ['425', 'beIN Sports USA'],
  ];
  
  let passed = 0;
  for (const [id, name] of channels) {
    if (await testFrontendFlow(id, name)) passed++;
  }
  
  console.log(`\n=== Results: ${passed}/${channels.length} passed ===`);
}

main();
