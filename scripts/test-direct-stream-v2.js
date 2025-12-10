#!/usr/bin/env node
/**
 * Test v2: Fresh token + immediate stream test
 * 
 * The 456 error might be because:
 * 1. Token expired between create_link and stream fetch
 * 2. Stream URL is single-use
 * 3. Some other timing issue
 */

const RPI_PROXY_URL = process.env.RPI_PROXY_URL || 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = process.env.RPI_PROXY_KEY || '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

const TEST_PORTAL = process.env.TEST_PORTAL || 'http://skunkytv.live/c';
const TEST_MAC = process.env.TEST_MAC || '00:1A:79:00:00:0C';

const STB_USER_AGENT = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';

function normalizePortalUrl(portalUrl) {
  let url = portalUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'http://' + url;
  url = url.replace(/\/+$/, '');
  if (url.endsWith('/c')) url = url.slice(0, -2);
  return url;
}

function parseSecureJson(text) {
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try { return JSON.parse(clean); } catch { return null; }
}

function buildHeaders(mac, token) {
  const encodedMac = encodeURIComponent(mac);
  const headers = {
    'User-Agent': STB_USER_AGENT,
    'X-User-Agent': 'Model: MAG250; Link: WiFi',
    'Accept': '*/*',
    'Cookie': `mac=${encodedMac}; stb_lang=en; timezone=GMT`,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function test() {
  console.log('Testing with fresh handshake through RPi proxy...\n');
  const portalUrl = normalizePortalUrl(TEST_PORTAL);

  // Step 1: Handshake through RPi proxy
  console.log('1. Handshake through RPi proxy...');
  const handshakeUrl = new URL('/portal.php', portalUrl);
  handshakeUrl.searchParams.set('type', 'stb');
  handshakeUrl.searchParams.set('action', 'handshake');
  handshakeUrl.searchParams.set('token', '');
  handshakeUrl.searchParams.set('JsHttpRequest', '1-xml');

  const rpiHandshakeParams = new URLSearchParams({
    url: handshakeUrl.toString(),
    mac: TEST_MAC,
    key: RPI_PROXY_KEY,
  });

  const handshakeRes = await fetch(`${RPI_PROXY_URL}/iptv/api?${rpiHandshakeParams}`);
  const handshakeText = await handshakeRes.text();
  const handshakeData = parseSecureJson(handshakeText);
  
  if (!handshakeData?.js?.token) {
    console.log('❌ Handshake failed');
    console.log(handshakeText.substring(0, 200));
    return;
  }
  
  const token = handshakeData.js.token;
  console.log(`✓ Token: ${token.substring(0, 20)}...`);


  // Step 2: Get channels through RPi proxy
  console.log('\n2. Get channels through RPi proxy...');
  const channelsUrl = new URL('/portal.php', portalUrl);
  channelsUrl.searchParams.set('type', 'itv');
  channelsUrl.searchParams.set('action', 'get_ordered_list');
  channelsUrl.searchParams.set('genre', '*');
  channelsUrl.searchParams.set('p', '0');
  channelsUrl.searchParams.set('JsHttpRequest', '1-xml');

  const rpiChannelsParams = new URLSearchParams({
    url: channelsUrl.toString(),
    mac: TEST_MAC,
    token: token,
    key: RPI_PROXY_KEY,
  });

  const channelsRes = await fetch(`${RPI_PROXY_URL}/iptv/api?${rpiChannelsParams}`);
  const channelsText = await channelsRes.text();
  const channelsData = parseSecureJson(channelsText);
  
  if (!channelsData?.js?.data?.length) {
    console.log('❌ No channels');
    return;
  }
  
  // Pick a USA channel (more likely to work)
  const usaChannel = channelsData.js.data.find(ch => ch.name?.includes('USA')) || channelsData.js.data[0];
  console.log(`✓ Using: ${usaChannel.name}`);
  console.log(`  cmd: ${usaChannel.cmd?.substring(0, 60)}...`);

  // Step 3: Create link through RPi proxy
  console.log('\n3. Create link through RPi proxy...');
  const createLinkUrl = new URL('/portal.php', portalUrl);
  createLinkUrl.searchParams.set('type', 'itv');
  createLinkUrl.searchParams.set('action', 'create_link');
  createLinkUrl.searchParams.set('cmd', usaChannel.cmd);
  createLinkUrl.searchParams.set('series', '');
  createLinkUrl.searchParams.set('forced_storage', 'undefined');
  createLinkUrl.searchParams.set('disable_ad', '0');
  createLinkUrl.searchParams.set('download', '0');
  createLinkUrl.searchParams.set('JsHttpRequest', '1-xml');

  const rpiLinkParams = new URLSearchParams({
    url: createLinkUrl.toString(),
    mac: TEST_MAC,
    token: token,
    key: RPI_PROXY_KEY,
  });

  const linkRes = await fetch(`${RPI_PROXY_URL}/iptv/api?${rpiLinkParams}`);
  const linkText = await linkRes.text();
  const linkData = parseSecureJson(linkText);
  
  let streamUrl = linkData?.js?.cmd || null;
  if (streamUrl) {
    streamUrl = streamUrl.replace(/^ffmpeg\s+/, '').trim();
  }
  
  if (!streamUrl || streamUrl.includes('stream=&')) {
    console.log('❌ No valid stream URL');
    console.log('Response:', linkText.substring(0, 300));
    return;
  }
  
  console.log(`✓ Stream URL: ${streamUrl.substring(0, 80)}...`);

  // Step 4: IMMEDIATELY stream through RPi proxy
  console.log('\n4. Stream through RPi proxy (immediate)...');
  const streamParams = new URLSearchParams({
    url: streamUrl,
    mac: TEST_MAC,
    key: RPI_PROXY_KEY,
  });

  const proxyStreamRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  
  console.log(`  Status: ${proxyStreamRes.status}`);
  console.log(`  Content-Type: ${proxyStreamRes.headers.get('content-type')}`);
  
  if (proxyStreamRes.ok && proxyStreamRes.headers.get('content-type')?.includes('video')) {
    // Read a chunk
    const reader = proxyStreamRes.body.getReader();
    const { value } = await reader.read();
    reader.cancel();
    
    console.log(`  ✓ Got ${value?.length || 0} bytes of video data!`);
    console.log('\n✅ RPi proxy streaming WORKS');
    
    // Now test direct access
    console.log('\n5. Test direct access from datacenter...');
    try {
      const directRes = await fetch(streamUrl, {
        headers: buildHeaders(TEST_MAC),
        signal: AbortSignal.timeout(10000),
      });
      console.log(`  Status: ${directRes.status}`);
      console.log(`  Content-Type: ${directRes.headers.get('content-type')}`);
      
      if (directRes.ok && directRes.headers.get('content-type')?.includes('video')) {
        console.log('\n🎉 DIRECT ACCESS WORKS! Token is NOT IP-bound!');
      } else {
        console.log('\n❌ Direct access blocked - Token IS IP-bound');
        console.log('   Client must stream through RPi proxy');
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  } else {
    console.log(`  ❌ Proxy stream failed`);
    const body = await proxyStreamRes.text();
    console.log(`  Body: ${body.substring(0, 200)}`);
  }
}

test().catch(console.error);
