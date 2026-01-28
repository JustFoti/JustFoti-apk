#!/usr/bin/env node
// Test full key fetch flow: JWT → PoW → Key

const RPI_URL = 'https://rpi-proxy.vynx.cc';
const KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';
const crypto = require('crypto');

// PoW computation (same as WASM)
const HMAC_SECRET = '444c44cc8888888844444444';
const POW_THRESHOLD = 0x1000;

function computePoWNonce(resource, keyNumber, timestamp) {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(resource).digest('hex');
  
  for (let nonce = 0; nonce < 100000; nonce++) {
    const data = `${hmac}${resource}${keyNumber}${timestamp}${nonce}`;
    const hash = crypto.createHash('md5').update(data).digest('hex');
    const prefix = parseInt(hash.substring(0, 4), 16);
    
    if (prefix < POW_THRESHOLD) {
      return nonce;
    }
  }
  return 99999;
}

async function test() {
  console.log('=== Full Key Fetch Flow Test ===\n');
  
  // Step 1: Get JWT
  console.log('1. Fetching JWT from topembed.pw via RPI...');
  const playerUrl = 'https://topembed.pw/channel/SkySportsNews[UK]';
  const rpiUrl = `${RPI_URL}/animekai?url=${encodeURIComponent(playerUrl)}&key=${KEY}&referer=${encodeURIComponent('https://dlhd.link/')}`;
  
  let jwt, channelKey;
  const start1 = Date.now();
  try {
    const res = await fetch(rpiUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const html = await res.text();
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (!jwtMatch) throw new Error('No JWT found');
    
    jwt = jwtMatch[0];
    const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    channelKey = payload.sub;
    
    console.log(`   ✅ JWT obtained in ${Date.now() - start1}ms`);
    console.log(`   Channel key: ${channelKey}`);
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}`);
    return;
  }
  
  // Step 2: Compute PoW
  console.log('\n2. Computing PoW nonce...');
  const timestamp = Math.floor(Date.now() / 1000);
  const keyNumber = '12345'; // Dummy key number
  const start2 = Date.now();
  const nonce = computePoWNonce(channelKey, keyNumber, timestamp);
  console.log(`   ✅ Nonce computed in ${Date.now() - start2}ms: ${nonce}`);
  
  // Step 3: Fetch key via RPI
  console.log('\n3. Fetching key via RPI /dlhd-key-v4...');
  const keyUrl = `https://chevy.dvalna.ru/key/${channelKey}/${keyNumber}`;
  const rpiKeyUrl = `${RPI_URL}/dlhd-key-v4?url=${encodeURIComponent(keyUrl)}&key=${KEY}&jwt=${jwt}&timestamp=${timestamp}&nonce=${nonce}`;
  
  const start3 = Date.now();
  try {
    const res = await fetch(rpiKeyUrl, { signal: AbortSignal.timeout(15000) });
    console.log(`   Status: ${res.status} (${Date.now() - start3}ms)`);
    
    if (res.ok) {
      const data = await res.arrayBuffer();
      if (data.byteLength === 16) {
        const hex = Array.from(new Uint8Array(data)).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log(`   ✅ Valid 16-byte key: ${hex}`);
      } else {
        const text = new TextDecoder().decode(data);
        console.log(`   ❌ Invalid response (${data.byteLength} bytes): ${text.substring(0, 200)}`);
      }
    } else {
      const text = await res.text();
      console.log(`   ❌ Failed: ${text.substring(0, 300)}`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
  
  console.log('\n=== Test Complete ===');
}

test().catch(console.error);
