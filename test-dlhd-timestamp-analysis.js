/**
 * Analyze DLHD timestamp requirements for key fetching
 */

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';

async function testTimestampRequirements() {
  console.log('=== DLHD TIMESTAMP ANALYSIS ===\n');
  
  const channelId = '51';
  
  // Get JWT and M3U8
  const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channelId}`;
  const playerRes = await fetch(playerUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://daddyhd.com/',
    },
  });
  
  const html = await playerRes.text();
  const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  const jwt = jwtMatch[0];
  
  const payload = JSON.parse(
    Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
  );
  const channelKey = payload.sub || `premium${channelId}`;
  
  // Get server key
  const lookupUrl = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
  const lookupRes = await fetch(lookupUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
    },
  });
  
  const lookupData = JSON.parse(await lookupRes.text());
  const serverKey = lookupData.server_key || 'zeko';
  
  // Fetch M3U8
  const m3u8Url = `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
  const m3u8Res = await fetch(m3u8Url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
    },
  });
  
  const m3u8Content = await m3u8Res.text();
  
  // Extract key URL and key number
  const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
  const keyUrl = keyMatch[1];
  const keyUrlMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
  const resource = keyUrlMatch[1];
  const keyNumber = keyUrlMatch[2];
  
  console.log(`Channel: ${channelId}`);
  console.log(`Channel Key: ${channelKey}`);
  console.log(`Key Number: ${keyNumber}`);
  console.log(`Key URL: ${keyUrl}\n`);
  
  // Analyze key number as timestamp
  const keyNumberInt = parseInt(keyNumber);
  const keyNumberHex = keyNumberInt.toString(16);
  
  console.log(`Key Number Analysis:`);
  console.log(`  Decimal: ${keyNumberInt}`);
  console.log(`  Hex: 0x${keyNumberHex}`);
  
  // Check if it's a Unix timestamp
  const currentUnixTime = Math.floor(Date.now() / 1000);
  console.log(`\nCurrent Unix Time: ${currentUnixTime}`);
  console.log(`Key Number as Unix Time: ${keyNumberInt}`);
  console.log(`Difference: ${currentUnixTime - keyNumberInt} seconds`);
  
  if (Math.abs(currentUnixTime - keyNumberInt) < 86400) {
    console.log(`✓ Key number appears to be a recent Unix timestamp!`);
    const keyDate = new Date(keyNumberInt * 1000);
    console.log(`  Date: ${keyDate.toISOString()}`);
  } else {
    console.log(`✗ Key number does NOT appear to be a Unix timestamp`);
  }
  
  // Try different timestamp strategies
  console.log(`\n=== TESTING DIFFERENT TIMESTAMP STRATEGIES ===\n`);
  
  const strategies = [
    { name: 'Current time', timestamp: Math.floor(Date.now() / 1000) },
    { name: 'Key number', timestamp: keyNumberInt },
    { name: 'Key number - 1', timestamp: keyNumberInt - 1 },
    { name: 'Key number + 1', timestamp: keyNumberInt + 1 },
    { name: 'Current time - 5s', timestamp: Math.floor(Date.now() / 1000) - 5 },
  ];
  
  for (const strategy of strategies) {
    console.log(`\nStrategy: ${strategy.name} (timestamp: ${strategy.timestamp})`);
    
    const nonce = await computePoWNonce(resource, keyNumber, strategy.timestamp);
    console.log(`  PoW nonce: ${nonce}`);
    
    const keyRes = await fetch(keyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
        'Authorization': `Bearer ${jwt}`,
        'X-Key-Timestamp': strategy.timestamp.toString(),
        'X-Key-Nonce': nonce.toString(),
      },
    });
    
    console.log(`  Status: ${keyRes.status}`);
    
    if (keyRes.ok) {
      const keyData = await keyRes.arrayBuffer();
      console.log(`  ✅ SUCCESS! Key fetched (${keyData.byteLength} bytes)`);
      console.log(`\n🎉 WORKING STRATEGY: ${strategy.name}`);
      console.log(`   Use timestamp: ${strategy.timestamp}`);
      return;
    } else {
      const errorText = await keyRes.text();
      console.log(`  ❌ Failed: ${errorText}`);
    }
  }
  
  console.log(`\n❌ All strategies failed!`);
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

testTimestampRequirements().catch(console.error);
