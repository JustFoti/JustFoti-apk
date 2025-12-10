#!/usr/bin/env node
/**
 * Full flow test - all through RPi proxy
 */

const RPI_PROXY_URL = 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';
const TEST_PORTAL = 'http://skunkytv.live';
const TEST_MAC = '00:1A:79:00:00:0C';

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
  console.log('Full flow test through RPi proxy\n');
  
  // 1. Handshake
  console.log('1. Handshake...');
  const handshakeUrl = `${TEST_PORTAL}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  const handshakeText = await rpiApi(handshakeUrl, TEST_MAC);
  const handshakeData = parseSecureJson(handshakeText);
  const token = handshakeData?.js?.token;
  if (!token) { console.log('❌ No token'); return; }
  console.log(`✓ Token: ${token}`);

  // 2. Get channels
  console.log('\n2. Get channels...');
  const channelsUrl = `${TEST_PORTAL}/portal.php?type=itv&action=get_ordered_list&genre=*&p=0&JsHttpRequest=1-xml`;
  const channelsText = await rpiApi(channelsUrl, TEST_MAC, token);
  const channelsData = parseSecureJson(channelsText);
  const channels = channelsData?.js?.data || [];
  if (!channels.length) { console.log('❌ No channels'); return; }
  
  // Find a USA channel
  const channel = channels.find(c => c.name?.includes('USA') && c.name?.includes('ESPN')) 
    || channels.find(c => c.name?.includes('USA'))
    || channels[0];
  console.log(`✓ Using: ${channel.name}`);
  console.log(`  Original cmd: ${channel.cmd}`);


  // 3. Create link
  console.log('\n3. Create link...');
  const cmd = encodeURIComponent(channel.cmd);
  const createLinkUrl = `${TEST_PORTAL}/portal.php?type=itv&action=create_link&cmd=${cmd}&series=&forced_storage=undefined&disable_ad=0&download=0&JsHttpRequest=1-xml`;
  const linkText = await rpiApi(createLinkUrl, TEST_MAC, token);
  console.log(`  Raw response: ${linkText.substring(0, 300)}`);
  
  const linkData = parseSecureJson(linkText);
  let streamUrl = linkData?.js?.cmd;
  if (streamUrl) {
    streamUrl = streamUrl.replace(/^ffmpeg\s+/, '').trim();
  }
  
  if (!streamUrl) { console.log('❌ No stream URL'); return; }
  console.log(`✓ Stream URL: ${streamUrl}`);
  
  // Check if stream URL has valid stream ID
  const streamMatch = streamUrl.match(/stream=(\d+)/);
  const playTokenMatch = streamUrl.match(/play_token=([^&]+)/);
  console.log(`  Stream ID: ${streamMatch?.[1] || 'MISSING'}`);
  console.log(`  Play Token: ${playTokenMatch?.[1] || 'MISSING'}`);

  // 4. Stream immediately
  console.log('\n4. Stream through RPi proxy...');
  const streamParams = new URLSearchParams({
    url: streamUrl,
    mac: TEST_MAC,
    key: RPI_PROXY_KEY,
  });
  
  const streamRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  
  console.log(`  Status: ${streamRes.status}`);
  console.log(`  Content-Type: ${streamRes.headers.get('content-type')}`);
  
  if (streamRes.ok) {
    const contentType = streamRes.headers.get('content-type') || '';
    if (contentType.includes('video') || contentType.includes('mp2t')) {
      const reader = streamRes.body.getReader();
      const { value } = await reader.read();
      reader.cancel();
      console.log(`  ✓ Got ${value?.length || 0} bytes of video!`);
      
      // Now test direct
      console.log('\n5. Test DIRECT access from datacenter...');
      const directRes = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
          'Cookie': `mac=${encodeURIComponent(TEST_MAC)}; stb_lang=en; timezone=GMT`,
        },
        signal: AbortSignal.timeout(10000),
      });
      console.log(`  Status: ${directRes.status}`);
      console.log(`  Content-Type: ${directRes.headers.get('content-type')}`);
      
      if (directRes.ok) {
        console.log('\n🎉 DIRECT ACCESS WORKS!');
      } else {
        console.log('\n❌ Direct access blocked - must use proxy');
      }
    } else {
      const body = await streamRes.text();
      console.log(`  ❌ Not video: ${body.substring(0, 200)}`);
    }
  } else {
    const body = await streamRes.text();
    console.log(`  ❌ Stream failed: ${body.substring(0, 200)}`);
    
    // Try to understand why
    console.log('\n  Debugging: Checking if portal is blocking...');
    
    // Try direct from RPi to see raw error
    const directParams = new URLSearchParams({
      url: streamUrl,
      key: RPI_PROXY_KEY,
    });
    const directRes = await fetch(`${RPI_PROXY_URL}/proxy?${directParams}`, {
      signal: AbortSignal.timeout(10000),
    });
    console.log(`  Direct proxy status: ${directRes.status}`);
    const directBody = await directRes.text();
    console.log(`  Direct proxy body: ${directBody.substring(0, 300)}`);
  }
}

test().catch(console.error);
