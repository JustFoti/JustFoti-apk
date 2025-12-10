#!/usr/bin/env node
/**
 * Test with a known working portal from the results file
 */

const RPI_PROXY_URL = 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

// Use a portal with 6221 channels from the working results
const TEST_PORTAL = 'http://sbhgoldpro.org/c';
const TEST_MAC = '00:1A:79:00:00:00';

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

function normalizePortal(url) {
  let u = url.trim().replace(/\/+$/, '');
  if (u.endsWith('/c')) u = u.slice(0, -2);
  return u;
}

async function test() {
  const portal = normalizePortal(TEST_PORTAL);
  console.log(`Testing portal: ${portal}`);
  console.log(`MAC: ${TEST_MAC}\n`);

  // 1. Handshake
  console.log('1. Handshake...');
  const handshakeUrl = `${portal}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  const handshakeText = await rpiApi(handshakeUrl, TEST_MAC);
  const handshakeData = parseSecureJson(handshakeText);
  const token = handshakeData?.js?.token;
  if (!token) { console.log('❌ No token:', handshakeText.substring(0, 200)); return; }
  console.log(`✓ Token: ${token}`);

  // 2. Get channels
  console.log('\n2. Get channels...');
  const channelsUrl = `${portal}/portal.php?type=itv&action=get_ordered_list&genre=*&p=0&JsHttpRequest=1-xml`;
  const channelsText = await rpiApi(channelsUrl, TEST_MAC, token);
  const channelsData = parseSecureJson(channelsText);
  const channels = channelsData?.js?.data || [];
  console.log(`✓ Found ${channels.length} channels (total: ${channelsData?.js?.total_items})`);
  
  if (!channels.length) return;

  // Find a USA channel
  const channel = channels.find(c => c.name?.includes('USA') && c.name?.includes('ESPN'))
    || channels.find(c => c.name?.includes('ESPN'))
    || channels.find(c => c.name?.includes('USA'))
    || channels[0];
  console.log(`  Using: ${channel.name}`);
  console.log(`  cmd: ${channel.cmd}`);


  // 3. Create link
  console.log('\n3. Create link...');
  const cmd = encodeURIComponent(channel.cmd);
  const createLinkUrl = `${portal}/portal.php?type=itv&action=create_link&cmd=${cmd}&series=&forced_storage=undefined&disable_ad=0&download=0&JsHttpRequest=1-xml`;
  const linkText = await rpiApi(createLinkUrl, TEST_MAC, token);
  console.log(`  Raw response: ${linkText.substring(0, 300)}`);
  
  const linkData = parseSecureJson(linkText);
  let streamUrl = linkData?.js?.cmd;
  if (streamUrl) streamUrl = streamUrl.replace(/^ffmpeg\s+/, '').trim();
  
  if (!streamUrl || streamUrl.includes('stream=&')) {
    console.log('❌ No valid stream URL');
    return;
  }
  console.log(`✓ Stream URL: ${streamUrl}`);

  // 4. Stream through RPi proxy
  console.log('\n4. Stream through RPi proxy...');
  const streamParams = new URLSearchParams({ url: streamUrl, mac: TEST_MAC, key: RPI_PROXY_KEY });
  const streamRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  
  console.log(`  Status: ${streamRes.status}`);
  console.log(`  Content-Type: ${streamRes.headers.get('content-type')}`);
  
  const contentType = streamRes.headers.get('content-type') || '';
  if (streamRes.ok && (contentType.includes('video') || contentType.includes('mp2t') || contentType.includes('octet'))) {
    const reader = streamRes.body.getReader();
    const { value } = await reader.read();
    reader.cancel();
    console.log(`  ✓ Got ${value?.length || 0} bytes of video!`);
    
    // 5. Test DIRECT access
    console.log('\n5. Test DIRECT access from datacenter...');
    try {
      const directRes = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
          'X-User-Agent': 'Model: MAG250; Link: WiFi',
          'Cookie': `mac=${encodeURIComponent(TEST_MAC)}; stb_lang=en; timezone=GMT`,
        },
        signal: AbortSignal.timeout(10000),
      });
      
      console.log(`  Status: ${directRes.status}`);
      console.log(`  Content-Type: ${directRes.headers.get('content-type')}`);
      
      const directContentType = directRes.headers.get('content-type') || '';
      if (directRes.ok && (directContentType.includes('video') || directContentType.includes('mp2t') || directContentType.includes('octet'))) {
        const directReader = directRes.body.getReader();
        const { value: directValue } = await directReader.read();
        directReader.cancel();
        console.log(`  ✓ Got ${directValue?.length || 0} bytes!`);
        console.log('\n🎉 SUCCESS! DIRECT ACCESS WORKS!');
        console.log('Token is NOT IP-bound - client can play directly!');
      } else {
        console.log('\n❌ Direct access blocked');
        console.log('Token IS IP-bound - must stream through proxy');
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
      console.log('\n❌ Direct access failed - must use proxy');
    }
  } else {
    const body = await streamRes.text();
    console.log(`  ❌ Stream failed: ${body.substring(0, 200)}`);
  }
}

test().catch(console.error);
