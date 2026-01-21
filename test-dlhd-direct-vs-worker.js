/**
 * Compare direct DLHD access vs Cloudflare Worker proxy
 * to identify what new security measures they added
 */

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';

async function testDirectAccess() {
  console.log('=== TESTING DIRECT ACCESS ===\n');
  
  const channelId = '51';
  
  // Step 1: Get JWT
  console.log('1. Fetching JWT from player page...');
  const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channelId}`;
  const playerRes = await fetch(playerUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://daddyhd.com/',
    },
  });
  
  console.log(`   Status: ${playerRes.status}`);
  console.log(`   Headers: ${JSON.stringify(Object.fromEntries(playerRes.headers.entries()), null, 2)}`);
  
  const html = await playerRes.text();
  const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  
  if (!jwtMatch) {
    console.log('   ❌ No JWT found');
    return;
  }
  
  const jwt = jwtMatch[0];
  console.log(`   ✓ JWT: ${jwt.substring(0, 50)}...`);
  
  const payload = JSON.parse(
    Buffer.from(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
  );
  console.log(`   ✓ Payload: ${JSON.stringify(payload, null, 2)}`);
  
  const channelKey = payload.sub || `premium${channelId}`;
  
  // Step 2: Server lookup
  console.log('\n2. Fetching server key...');
  const lookupUrl = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
  const lookupRes = await fetch(lookupUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
    },
  });
  
  console.log(`   Status: ${lookupRes.status}`);
  const lookupText = await lookupRes.text();
  console.log(`   Response: ${lookupText}`);
  
  let serverKey = 'zeko';
  if (lookupRes.ok && lookupText.startsWith('{')) {
    const lookupData = JSON.parse(lookupText);
    serverKey = lookupData.server_key || 'zeko';
  }
  console.log(`   ✓ Server key: ${serverKey}`);
  
  // Step 3: M3U8 fetch
  console.log('\n3. Fetching M3U8 playlist...');
  const m3u8Url = `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
  console.log(`   URL: ${m3u8Url}`);
  
  const m3u8Res = await fetch(m3u8Url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
      'Authorization': `Bearer ${jwt}`,
    },
  });
  
  console.log(`   Status: ${m3u8Res.status}`);
  console.log(`   Headers: ${JSON.stringify(Object.fromEntries(m3u8Res.headers.entries()), null, 2)}`);
  
  if (!m3u8Res.ok) {
    const errorText = await m3u8Res.text();
    console.log(`   ❌ Error: ${errorText.substring(0, 200)}`);
    return;
  }
  
  const m3u8Content = await m3u8Res.text();
  console.log(`   ✓ M3U8 fetched (${m3u8Content.length} bytes)`);
  console.log(`   Preview: ${m3u8Content.substring(0, 300)}...`);
  
  // Extract first segment URL
  const lines = m3u8Content.split('\n');
  let segmentUrl = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('https://')) {
      segmentUrl = line;
      // Check if next line is a continuation
      if (i + 1 < lines.length && !lines[i + 1].trim().startsWith('#') && !lines[i + 1].trim().startsWith('https://')) {
        segmentUrl += lines[i + 1].trim();
      }
      break;
    }
  }
  
  console.log(`\n   First segment URL: ${segmentUrl.substring(0, 100)}...`);
  
  // Step 4: Try to fetch segment
  console.log('\n4. Fetching first segment...');
  const segRes = await fetch(segmentUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
    },
  });
  
  console.log(`   Status: ${segRes.status}`);
  console.log(`   Headers: ${JSON.stringify(Object.fromEntries(segRes.headers.entries()), null, 2)}`);
  
  if (segRes.ok) {
    const segData = await segRes.arrayBuffer();
    console.log(`   ✓ Segment fetched (${segData.byteLength} bytes)`);
  } else {
    const errorText = await segRes.text();
    console.log(`   ❌ Error: ${errorText.substring(0, 200)}`);
  }
  
  // Step 5: Try to fetch encryption key
  console.log('\n5. Fetching encryption key...');
  const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
  if (!keyMatch) {
    console.log('   ❌ No key URL found');
    return;
  }
  
  const keyUrl = keyMatch[1];
  console.log(`   Key URL: ${keyUrl}`);
  
  // Extract resource and key number for PoW
  const keyUrlMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
  if (!keyUrlMatch) {
    console.log('   ❌ Invalid key URL format');
    return;
  }
  
  const resource = keyUrlMatch[1];
  const keyNumber = keyUrlMatch[2];
  
  // Compute PoW nonce
  console.log(`   Computing PoW nonce for resource=${resource}, keyNumber=${keyNumber}...`);
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = await computePoWNonce(resource, keyNumber, timestamp);
  console.log(`   ✓ PoW nonce: ${nonce} (timestamp: ${timestamp})`);
  
  // Try WITHOUT PoW first
  console.log('\n   5a. Trying key fetch WITHOUT PoW headers...');
  const keyRes1 = await fetch(keyUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
      'Authorization': `Bearer ${jwt}`,
    },
  });
  
  console.log(`   Status: ${keyRes1.status}`);
  if (!keyRes1.ok) {
    const errorText = await keyRes1.text();
    console.log(`   Response: ${errorText.substring(0, 200)}`);
  } else {
    const keyData = await keyRes1.arrayBuffer();
    console.log(`   ✓ Key fetched WITHOUT PoW! (${keyData.byteLength} bytes)`);
  }
  
  // Try WITH PoW
  console.log('\n   5b. Trying key fetch WITH PoW headers...');
  const keyRes2 = await fetch(keyUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
      'Authorization': `Bearer ${jwt}`,
      'X-Key-Timestamp': timestamp.toString(),
      'X-Key-Nonce': nonce.toString(),
    },
  });
  
  console.log(`   Status: ${keyRes2.status}`);
  if (!keyRes2.ok) {
    const errorText = await keyRes2.text();
    console.log(`   Response: ${errorText.substring(0, 200)}`);
  } else {
    const keyData = await keyRes2.arrayBuffer();
    console.log(`   ✓ Key fetched WITH PoW! (${keyData.byteLength} bytes)`);
  }
  
  console.log('\n=== DIRECT ACCESS TEST COMPLETE ===\n');
}

async function computePoWNonce(resource, keyNumber, timestamp) {
  const HMAC_SECRET = '7f9e2a8b3c5d1e4f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7';
  const THRESHOLD = 0x1000;
  
  // Compute HMAC
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
  
  // Find nonce
  for (let nonce = 0; nonce < 100000; nonce++) {
    const data = `${hmac}${resource}${keyNumber}${timestamp}${nonce}`;
    
    // MD5 hash
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(data).digest('hex');
    const prefix = parseInt(hash.substring(0, 4), 16);
    
    if (prefix < THRESHOLD) {
      return nonce;
    }
  }
  
  throw new Error('PoW failed');
}

testDirectAccess().catch(console.error);
