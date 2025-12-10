#!/usr/bin/env node
/**
 * Test: Get link from RPi, stream from datacenter
 * This tests if the stream URL itself is IP-bound
 */

const RPI_PROXY_URL = 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';
const PORTAL = 'http://sbhgoldpro.org';
const MAC = '00:1A:79:00:00:00';

function parseSecureJson(text) {
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try { return JSON.parse(clean); } catch { return null; }
}

async function rpiApi(url, mac, token = null) {
  const params = new URLSearchParams({ url, mac, key: RPI_PROXY_KEY });
  if (token) params.set('token', token);
  const res = await fetch(`${RPI_PROXY_URL}/iptv/api?${params}`);
  return res.text();
}

async function test() {
  console.log('Test: Get stream URL from RPi, try to play from datacenter\n');

  // All API calls through RPi
  console.log('1. Handshake through RPi...');
  const handshakeUrl = `${PORTAL}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  const handshakeData = parseSecureJson(await rpiApi(handshakeUrl, MAC));
  const token = handshakeData?.js?.token;
  console.log(`   Token: ${token}`);

  console.log('\n2. Get channels through RPi...');
  const channelsUrl = `${PORTAL}/portal.php?type=itv&action=get_ordered_list&genre=*&p=0&JsHttpRequest=1-xml`;
  const channelsData = parseSecureJson(await rpiApi(channelsUrl, MAC, token));
  const channel = channelsData?.js?.data?.[0];
  console.log(`   Channel: ${channel?.name}`);

  console.log('\n3. Create link through RPi...');
  const cmd = encodeURIComponent(channel.cmd);
  const linkUrl = `${PORTAL}/portal.php?type=itv&action=create_link&cmd=${cmd}&series=&forced_storage=undefined&disable_ad=0&download=0&JsHttpRequest=1-xml`;
  const linkData = parseSecureJson(await rpiApi(linkUrl, MAC, token));
  let streamUrl = linkData?.js?.cmd?.replace(/^ffmpeg\s+/, '').trim();
  
  const streamMatch = streamUrl?.match(/stream=(\d+)/);
  console.log(`   Stream URL: ${streamUrl?.substring(0, 80)}...`);
  console.log(`   Stream ID: ${streamMatch?.[1] || 'EMPTY!'}`);

  if (!streamMatch?.[1]) {
    console.log('\n❌ No valid stream ID - portal may be blocking');
    return;
  }

  // Now try to stream from DATACENTER using the RPi-obtained URL
  console.log('\n4. Try to stream from DATACENTER using RPi-obtained URL...');
  try {
    const directRes = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
        'Cookie': `mac=${encodeURIComponent(MAC)}; stb_lang=en; timezone=GMT`,
      },
      signal: AbortSignal.timeout(15000),
    });
    
    console.log(`   Status: ${directRes.status}`);
    console.log(`   Content-Type: ${directRes.headers.get('content-type')}`);
    
    if (directRes.ok && directRes.headers.get('content-type')?.includes('video')) {
      console.log('\n🎉 SUCCESS! Stream URL from RPi works from datacenter!');
      console.log('   Token is NOT IP-bound for streaming!');
    } else {
      console.log('\n❌ Stream blocked - IP is checked for streaming');
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
    console.log('\n❌ Stream blocked/failed - must use proxy');
  }

  // Control: Stream through RPi
  console.log('\n5. Control test: Stream through RPi...');
  const streamParams = new URLSearchParams({ url: streamUrl, mac: MAC, key: RPI_PROXY_KEY });
  const proxyRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  console.log(`   Status: ${proxyRes.status}`);
  console.log(`   Content-Type: ${proxyRes.headers.get('content-type')}`);
  
  if (proxyRes.ok && proxyRes.headers.get('content-type')?.includes('video')) {
    const reader = proxyRes.body.getReader();
    const { value } = await reader.read();
    reader.cancel();
    console.log(`   ✓ Got ${value?.length || 0} bytes through proxy`);
  }
}

test().catch(console.error);
