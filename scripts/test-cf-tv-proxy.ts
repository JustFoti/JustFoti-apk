/**
 * Test Cloudflare Worker TV Proxy
 * 
 * Tests the deployed Cloudflare Worker for DLHD live TV streaming.
 * Run: npx ts-node scripts/test-cf-tv-proxy.ts
 */

// Get the CF proxy URL from environment or use default
const CF_TV_PROXY_URL = process.env.NEXT_PUBLIC_CF_TV_PROXY_URL || 'https://media-proxy.vynx.workers.dev/tv';
const TEST_CHANNEL = '325'; // ESPN

async function testPlaylist(): Promise<boolean> {
  console.log('\n=== Test 1: Fetch M3U8 Playlist ===');
  const url = `${CF_TV_PROXY_URL}?channel=${TEST_CHANNEL}`;
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/',
      },
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const text = await response.text();
      console.log(`Error: ${text}`);
      return false;
    }
    
    const content = await response.text();
    console.log(`Content length: ${content.length}`);
    console.log(`Is valid M3U8: ${content.includes('#EXTM3U')}`);
    console.log(`Has key URL: ${content.includes('URI=')}`);
    console.log(`Has segments: ${content.includes('/tv/segment')}`);
    console.log(`\nFirst 500 chars:\n${content.substring(0, 500)}`);
    
    return content.includes('#EXTM3U');
  } catch (err) {
    console.log(`Error: ${(err as Error).message}`);
    return false;
  }
}

async function testKeyProxy(): Promise<boolean> {
  console.log('\n=== Test 2: Fetch Encryption Key ===');
  
  // First get the M3U8 to extract the key URL
  const playlistUrl = `${CF_TV_PROXY_URL}?channel=${TEST_CHANNEL}`;
  
  try {
    const playlistRes = await fetch(playlistUrl, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/',
      },
    });
    
    if (!playlistRes.ok) {
      console.log('Failed to get playlist');
      return false;
    }
    
    const playlist = await playlistRes.text();
    
    // Extract the proxied key URL from the playlist
    const keyMatch = playlist.match(/URI="([^"]+)"/);
    if (!keyMatch) {
      console.log('No key URL found in playlist');
      return false;
    }
    
    const keyUrl = keyMatch[1];
    console.log(`Key URL: ${keyUrl}`);
    
    const keyRes = await fetch(keyUrl, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/',
      },
    });
    
    console.log(`Status: ${keyRes.status}`);
    
    if (!keyRes.ok) {
      const text = await keyRes.text();
      console.log(`Error: ${text}`);
      return false;
    }
    
    const keyData = await keyRes.arrayBuffer();
    console.log(`Key size: ${keyData.byteLength} bytes`);
    console.log(`Key hex: ${Buffer.from(keyData).toString('hex')}`);
    
    return keyData.byteLength === 16;
  } catch (err) {
    console.log(`Error: ${(err as Error).message}`);
    return false;
  }
}

async function testSegmentProxy(): Promise<boolean> {
  console.log('\n=== Test 3: Fetch Video Segment ===');
  
  // First get the M3U8 to extract a segment URL
  const playlistUrl = `${CF_TV_PROXY_URL}?channel=${TEST_CHANNEL}`;
  
  try {
    const playlistRes = await fetch(playlistUrl, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/',
      },
    });
    
    if (!playlistRes.ok) {
      console.log('Failed to get playlist');
      return false;
    }
    
    const playlist = await playlistRes.text();
    
    // Extract a segment URL from the playlist
    const segmentMatch = playlist.match(/\/tv\/segment\?url=[^\s]+/);
    if (!segmentMatch) {
      console.log('No segment URL found in playlist');
      console.log('Playlist content:', playlist.substring(0, 1000));
      return false;
    }
    
    // Construct full URL
    const baseUrl = new URL(CF_TV_PROXY_URL).origin;
    const segmentUrl = `${baseUrl}${segmentMatch[0]}`;
    console.log(`Segment URL: ${segmentUrl.substring(0, 150)}...`);
    
    const segmentRes = await fetch(segmentUrl, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/',
      },
    });
    
    console.log(`Status: ${segmentRes.status}`);
    console.log(`Content-Type: ${segmentRes.headers.get('content-type')}`);
    
    if (!segmentRes.ok) {
      const text = await segmentRes.text();
      console.log(`Error: ${text.substring(0, 500)}`);
      return false;
    }
    
    const segmentData = await segmentRes.arrayBuffer();
    console.log(`Segment size: ${segmentData.byteLength} bytes`);
    
    return segmentData.byteLength > 0;
  } catch (err) {
    console.log(`Error: ${(err as Error).message}`);
    return false;
  }
}

async function main() {
  console.log('=== Cloudflare TV Proxy Test ===');
  console.log(`Proxy URL: ${CF_TV_PROXY_URL}`);
  console.log(`Test Channel: ${TEST_CHANNEL}`);
  
  const results = {
    playlist: await testPlaylist(),
    key: await testKeyProxy(),
    segment: await testSegmentProxy(),
  };
  
  console.log('\n=== Results ===');
  console.log(`Playlist: ${results.playlist ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Key: ${results.key ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Segment: ${results.segment ? '✓ PASS' : '✗ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\nOverall: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 The Cloudflare Worker TV proxy is working correctly!');
    console.log('You can now use it without the RPI proxy.');
  }
}

main();
