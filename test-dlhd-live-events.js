/**
 * Test DLHD Live Events End-to-End
 * Validates that live streams work with the timestamp fix
 */

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';

async function testLiveEvent(channelId, channelName) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${channelName} (Channel ${channelId})`);
  console.log('='.repeat(70));
  
  try {
    // Step 1: Get JWT
    console.log('\n[1/6] Fetching JWT token...');
    const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channelId}`;
    const playerRes = await fetch(playerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://daddyhd.com/',
      },
    });
    
    if (!playerRes.ok) {
      console.log(`❌ Player page fetch failed: ${playerRes.status}`);
      return { channel: channelName, status: 'PLAYER_FAILED' };
    }
    
    const html = await playerRes.text();
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    
    if (!jwtMatch) {
      console.log('❌ No JWT found in player page');
      return { channel: channelName, status: 'NO_JWT' };
    }
    
    const jwt = jwtMatch[0];
    const payload = JSON.parse(
      Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );
    const channelKey = payload.sub || `premium${channelId}`;
    
    console.log(`✓ JWT obtained`);
    console.log(`  Channel Key: ${channelKey}`);
    console.log(`  Country: ${payload.country}`);
    console.log(`  Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    
    // Step 2: Get server key
    console.log('\n[2/6] Looking up server key...');
    const lookupUrl = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
    const lookupRes = await fetch(lookupUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });
    
    let serverKey = 'zeko';
    if (lookupRes.ok) {
      const lookupText = await lookupRes.text();
      if (lookupText.startsWith('{')) {
        const lookupData = JSON.parse(lookupText);
        serverKey = lookupData.server_key || 'zeko';
      }
    }
    
    console.log(`✓ Server key: ${serverKey}`);
    
    // Step 3: Fetch M3U8 playlist
    console.log('\n[3/6] Fetching M3U8 playlist...');
    const m3u8Url = serverKey === 'top1/cdn' 
      ? `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`
      : `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
    
    console.log(`  URL: ${m3u8Url}`);
    
    const m3u8Res = await fetch(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });
    
    if (!m3u8Res.ok) {
      console.log(`❌ M3U8 fetch failed: ${m3u8Res.status}`);
      return { channel: channelName, status: 'M3U8_FAILED', serverKey };
    }
    
    const m3u8Content = await m3u8Res.text();
    console.log(`✓ M3U8 fetched (${m3u8Content.length} bytes)`);
    
    // Parse M3U8
    const lines = m3u8Content.split('\n');
    const mediaSequence = m3u8Content.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)?.[1];
    const targetDuration = m3u8Content.match(/#EXT-X-TARGETDURATION:(\d+)/)?.[1];
    
    console.log(`  Media Sequence: ${mediaSequence}`);
    console.log(`  Target Duration: ${targetDuration}s`);
    
    // Extract segments (handle multi-line URLs)
    const segments = [];
    let currentUrl = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('https://')) {
        if (currentUrl) {
          segments.push(currentUrl);
        }
        currentUrl = trimmed;
      } else if (currentUrl && trimmed && !trimmed.startsWith('#')) {
        currentUrl += trimmed;
      } else if (trimmed.startsWith('#') || !trimmed) {
        if (currentUrl) {
          segments.push(currentUrl);
          currentUrl = '';
        }
      }
    }
    
    if (currentUrl) {
      segments.push(currentUrl);
    }
    
    console.log(`  Segments found: ${segments.length}`);
    
    if (segments.length === 0) {
      console.log('❌ No segments in playlist');
      return { channel: channelName, status: 'NO_SEGMENTS', serverKey };
    }
    
    console.log(`  First segment: ${segments[0].substring(0, 80)}...`);
    console.log(`  Segment length: ${segments[0].length} chars`);
    
    // Step 4: Extract and test encryption key
    console.log('\n[4/6] Testing encryption key fetch...');
    const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
    
    if (!keyMatch) {
      console.log('⚠️  No encryption key (unencrypted stream)');
    } else {
      const keyUrl = keyMatch[1];
      const keyUrlMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
      
      if (!keyUrlMatch) {
        console.log('❌ Invalid key URL format');
        return { channel: channelName, status: 'INVALID_KEY_URL', serverKey };
      }
      
      const resource = keyUrlMatch[1];
      const keyNumber = keyUrlMatch[2];
      
      console.log(`  Key URL: ${keyUrl}`);
      console.log(`  Resource: ${resource}`);
      console.log(`  Key Number: ${keyNumber}`);
      
      // Use FIXED timestamp (current - 7 seconds)
      const timestamp = Math.floor(Date.now() / 1000) - 7;
      const nonce = await computePoWNonce(resource, keyNumber, timestamp);
      
      console.log(`  Timestamp: ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);
      console.log(`  PoW Nonce: ${nonce}`);
      
      const keyRes = await fetch(keyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': `https://${PLAYER_DOMAIN}`,
          'Referer': `https://${PLAYER_DOMAIN}/`,
          'Authorization': `Bearer ${jwt}`,
          'X-Key-Timestamp': timestamp.toString(),
          'X-Key-Nonce': nonce.toString(),
        },
      });
      
      console.log(`  Key fetch status: ${keyRes.status}`);
      
      if (!keyRes.ok) {
        const errorText = await keyRes.text();
        console.log(`❌ Key fetch failed: ${errorText}`);
        return { channel: channelName, status: 'KEY_FAILED', serverKey, error: errorText };
      }
      
      const keyData = await keyRes.arrayBuffer();
      
      if (keyData.byteLength !== 16) {
        console.log(`❌ Invalid key size: ${keyData.byteLength} bytes (expected 16)`);
        return { channel: channelName, status: 'INVALID_KEY_SIZE', serverKey };
      }
      
      const keyHex = Array.from(new Uint8Array(keyData))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      console.log(`✓ Encryption key fetched (16 bytes)`);
      console.log(`  Key (hex): ${keyHex.substring(0, 32)}...`);
    }
    
    // Step 5: Test segment fetch
    console.log('\n[5/6] Testing segment fetch...');
    const testSegmentUrl = segments[0];
    
    const segRes = await fetch(testSegmentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });
    
    console.log(`  Segment fetch status: ${segRes.status}`);
    
    if (!segRes.ok) {
      console.log(`❌ Segment fetch failed`);
      return { channel: channelName, status: 'SEGMENT_FAILED', serverKey };
    }
    
    const segData = await segRes.arrayBuffer();
    const firstBytes = new Uint8Array(segData.slice(0, 16));
    
    console.log(`✓ Segment fetched (${(segData.byteLength / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`  First bytes: ${Array.from(firstBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    if (firstBytes[0] === 0x47) {
      console.log(`  Format: Unencrypted MPEG-TS`);
    } else {
      console.log(`  Format: Encrypted (AES-128)`);
    }
    
    // Step 6: Validate live stream
    console.log('\n[6/6] Validating live stream...');
    
    // Check if it's actually live (media sequence should be high)
    const isLive = mediaSequence && parseInt(mediaSequence) > 1000;
    console.log(`  Is Live: ${isLive ? 'YES' : 'NO'} (sequence: ${mediaSequence})`);
    
    // Check segment freshness
    const programDateTime = m3u8Content.match(/#EXT-X-PROGRAM-DATE-TIME:([^\n]+)/)?.[1];
    if (programDateTime) {
      const segmentTime = new Date(programDateTime);
      const now = new Date();
      const ageSeconds = Math.floor((now.getTime() - segmentTime.getTime()) / 1000);
      
      console.log(`  Segment timestamp: ${segmentTime.toISOString()}`);
      console.log(`  Segment age: ${ageSeconds} seconds`);
      
      if (ageSeconds < 60) {
        console.log(`  ✓ Stream is LIVE (fresh segments)`);
      } else {
        console.log(`  ⚠️  Stream may be delayed (${ageSeconds}s old)`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`✅ SUCCESS - ${channelName} is working!`);
    console.log('='.repeat(70));
    
    return {
      channel: channelName,
      channelId,
      status: 'SUCCESS',
      serverKey,
      segments: segments.length,
      segmentSize: (segData.byteLength / 1024 / 1024).toFixed(2) + ' MB',
      isLive,
      mediaSequence,
    };
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    console.log(error.stack);
    return { channel: channelName, status: 'ERROR', error: error.message };
  }
}

async function computePoWNonce(resource, keyNumber, timestamp) {
  const HMAC_SECRET = '7f9e2a8b3c5d1e4f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7';
  const THRESHOLD = 0x1000;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const hmacData = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(resource));
  const hmac = Array.from(new Uint8Array(hmacData))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  for (let nonce = 0; nonce < 100000; nonce++) {
    const data = `${hmac}${resource}${keyNumber}${timestamp}${nonce}`;
    
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(data).digest('hex');
    const prefix = parseInt(hash.substring(0, 4), 16);
    
    if (prefix < THRESHOLD) {
      return nonce;
    }
  }
  
  throw new Error('PoW computation failed');
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         DLHD LIVE EVENTS VALIDATION TEST                           ║');
  console.log('║         Testing with Timestamp Fix (timestamp - 7 seconds)         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  const liveChannels = [
    { id: '51', name: 'ABC USA' },
    { id: '325', name: 'ESPN' },
    { id: '326', name: 'ESPN 2' },
    { id: '200', name: 'CNN' },
    { id: '100', name: 'FOX Sports 1' },
  ];
  
  const results = [];
  
  for (const channel of liveChannels) {
    const result = await testLiveEvent(channel.id, channel.name);
    results.push(result);
    
    // Rate limit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final Summary
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                        FINAL SUMMARY                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  const successful = results.filter(r => r.status === 'SUCCESS');
  const failed = results.filter(r => r.status !== 'SUCCESS');
  
  console.log(`\nTotal Channels Tested: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`Success Rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
  
  if (successful.length > 0) {
    console.log('\n✅ Working Channels:');
    for (const result of successful) {
      console.log(`  • ${result.channel} (${result.channelId})`);
      console.log(`    Server: ${result.serverKey}, Segments: ${result.segments}, Live: ${result.isLive ? 'YES' : 'NO'}`);
    }
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Channels:');
    for (const result of failed) {
      console.log(`  • ${result.channel} (${result.channelId || result.status})`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (successful.length === results.length) {
    console.log('🎉 ALL LIVE EVENTS WORKING! The timestamp fix is successful!');
  } else if (successful.length > 0) {
    console.log('⚠️  PARTIAL SUCCESS - Some channels working, investigate failures');
  } else {
    console.log('❌ ALL TESTS FAILED - The fix may need adjustment');
  }
  
  console.log('='.repeat(70) + '\n');
}

main().catch(console.error);
