/**
 * Verify DLHD January 2026 Timestamp Fix
 * Tests that using timestamp - 7 seconds works for key fetching
 */

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';

async function testDLHDFix() {
  console.log('=== DLHD JANUARY 2026 TIMESTAMP FIX VERIFICATION ===\n');
  
  const testChannels = [
    { id: '51', name: 'ABC USA' },
    { id: '325', name: 'ESPN' },
    { id: '200', name: 'CNN' },
  ];
  
  const results = [];
  
  for (const channel of testChannels) {
    console.log(`\nTesting ${channel.name} (${channel.id})...`);
    
    try {
      // Step 1: Get JWT
      const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channel.id}`;
      const playerRes = await fetch(playerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://daddyhd.com/',
        },
      });
      
      const html = await playerRes.text();
      const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      
      if (!jwtMatch) {
        console.log('  ❌ No JWT found');
        results.push({ ...channel, status: 'NO_JWT' });
        continue;
      }
      
      const jwt = jwtMatch[0];
      const payload = JSON.parse(
        Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
      );
      const channelKey = payload.sub || `premium${channel.id}`;
      
      console.log(`  ✓ JWT obtained`);
      
      // Step 2: Get server key
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
      
      console.log(`  ✓ Server: ${serverKey}`);
      
      // Step 3: Fetch M3U8
      const m3u8Url = `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
      const m3u8Res = await fetch(m3u8Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': `https://${PLAYER_DOMAIN}`,
          'Referer': `https://${PLAYER_DOMAIN}/`,
        },
      });
      
      if (!m3u8Res.ok) {
        console.log(`  ❌ M3U8 fetch failed: ${m3u8Res.status}`);
        results.push({ ...channel, status: 'M3U8_FAILED', serverKey });
        continue;
      }
      
      const m3u8Content = await m3u8Res.text();
      console.log(`  ✓ M3U8 fetched (${m3u8Content.length} bytes)`);
      
      // Step 4: Extract key URL
      const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
      if (!keyMatch) {
        console.log(`  ❌ No key URL found`);
        results.push({ ...channel, status: 'NO_KEY_URL', serverKey });
        continue;
      }
      
      const keyUrl = keyMatch[1];
      const keyUrlMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
      if (!keyUrlMatch) {
        console.log(`  ❌ Invalid key URL format`);
        results.push({ ...channel, status: 'INVALID_KEY_URL', serverKey });
        continue;
      }
      
      const resource = keyUrlMatch[1];
      const keyNumber = keyUrlMatch[2];
      
      console.log(`  ✓ Key URL: ${keyUrl}`);
      
      // Step 5: Test key fetch with FIXED timestamp (current - 7 seconds)
      const timestamp = Math.floor(Date.now() / 1000) - 7;
      const nonce = await computePoWNonce(resource, keyNumber, timestamp);
      
      console.log(`  ✓ PoW computed (nonce: ${nonce}, timestamp: ${timestamp})`);
      
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
      
      if (!keyRes.ok) {
        const errorText = await keyRes.text();
        console.log(`  ❌ Key fetch failed: ${keyRes.status} - ${errorText}`);
        results.push({ ...channel, status: 'KEY_FAILED', serverKey, error: errorText });
        continue;
      }
      
      const keyData = await keyRes.arrayBuffer();
      
      if (keyData.byteLength !== 16) {
        console.log(`  ❌ Invalid key size: ${keyData.byteLength} bytes (expected 16)`);
        results.push({ ...channel, status: 'INVALID_KEY_SIZE', serverKey });
        continue;
      }
      
      console.log(`  ✅ SUCCESS! Key fetched (${keyData.byteLength} bytes)`);
      results.push({ ...channel, status: 'SUCCESS', serverKey });
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({ ...channel, status: 'ERROR', error: error.message });
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n\n=== SUMMARY ===\n');
  
  const successful = results.filter(r => r.status === 'SUCCESS');
  const failed = results.filter(r => r.status !== 'SUCCESS');
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length === results.length) {
    console.log('\n🎉 ALL TESTS PASSED! The timestamp fix is working!');
    console.log('\nThe fix: Use timestamp = Math.floor(Date.now() / 1000) - 7');
    console.log('This accounts for DLHD\'s new security requirement that timestamps must be 5-10 seconds in the past.');
  } else if (successful.length > 0) {
    console.log('\n⚠️  PARTIAL SUCCESS - Some channels working, some failing');
  } else {
    console.log('\n❌ ALL TESTS FAILED - The fix may need adjustment');
  }
  
  if (failed.length > 0) {
    console.log('\nFailed channels:');
    for (const result of failed) {
      console.log(`  ${result.id} (${result.name}): ${result.status}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
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
  
  throw new Error('PoW failed');
}

testDLHDFix().catch(console.error);
