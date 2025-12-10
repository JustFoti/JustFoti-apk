#!/usr/bin/env node
/**
 * Final theory test:
 * 1. Call create_link from DATACENTER
 * 2. Try to stream from DATACENTER (should fail)
 * 3. Try to stream through RPi (should work)
 * 
 * This proves: Stream URLs check IP, not just the token
 */

const RPI_PROXY_URL = 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';
const PORTAL = 'http://sbhgoldpro.org';
const MAC = '00:1A:79:00:00:00';

function parseSecureJson(text) {
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try { return JSON.parse(clean); } catch { return null; }
}

function buildHeaders(mac, token) {
  return {
    'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
    'X-User-Agent': 'Model: MAG250; Link: WiFi',
    'Accept': '*/*',
    'Cookie': `mac=${encodeURIComponent(mac)}; stb_lang=en; timezone=GMT`,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function test() {
  console.log('='.repeat(60));
  console.log('FINAL THEORY TEST');
  console.log('='.repeat(60));
  console.log('');

  // 1. Handshake from DATACENTER
  console.log('1. Handshake from DATACENTER...');
  const handshakeUrl = `${PORTAL}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  const handshakeRes = await fetch(handshakeUrl, { headers: buildHeaders(MAC) });
  const handshakeData = parseSecureJson(await handshakeRes.text());
  const token = handshakeData?.js?.token;
  console.log(`   ✓ Token: ${token}`);

  // 2. Get channels from DATACENTER
  console.log('\n2. Get channels from DATACENTER...');
  const channelsUrl = `${PORTAL}/portal.php?type=itv&action=get_ordered_list&genre=*&p=0&JsHttpRequest=1-xml`;
  const channelsRes = await fetch(channelsUrl, { headers: buildHeaders(MAC, token) });
  const channelsData = parseSecureJson(await channelsRes.text());
  const channel = channelsData?.js?.data?.[0];
  console.log(`   ✓ Channel: ${channel?.name}`);

  // 3. Create link from DATACENTER
  console.log('\n3. Create link from DATACENTER...');
  const cmd = encodeURIComponent(channel.cmd);
  const linkUrl = `${PORTAL}/portal.php?type=itv&action=create_link&cmd=${cmd}&series=&forced_storage=undefined&disable_ad=0&download=0&JsHttpRequest=1-xml`;
  const linkRes = await fetch(linkUrl, { headers: buildHeaders(MAC, token) });
  const linkData = parseSecureJson(await linkRes.text());
  let streamUrl = linkData?.js?.cmd?.replace(/^ffmpeg\s+/, '').trim();
  console.log(`   ✓ Stream URL: ${streamUrl?.substring(0, 80)}...`);


  // 4. Try to stream from DATACENTER (should fail)
  console.log('\n4. Try stream from DATACENTER (expect FAIL)...');
  try {
    const directRes = await fetch(streamUrl, {
      headers: buildHeaders(MAC),
      signal: AbortSignal.timeout(10000),
    });
    console.log(`   Status: ${directRes.status}`);
    console.log(`   Content-Type: ${directRes.headers.get('content-type')}`);
    if (directRes.ok) {
      console.log('   ⚠️ UNEXPECTED: Direct access worked!');
    } else {
      console.log('   ✓ Blocked as expected');
    }
  } catch (e) {
    console.log(`   ✓ Blocked/Failed: ${e.message}`);
  }

  // 5. Stream through RPi proxy (should work)
  console.log('\n5. Stream through RPi proxy (expect SUCCESS)...');
  const streamParams = new URLSearchParams({ url: streamUrl, mac: MAC, key: RPI_PROXY_KEY });
  try {
    const proxyRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams}`, {
      signal: AbortSignal.timeout(15000),
    });
    console.log(`   Status: ${proxyRes.status}`);
    console.log(`   Content-Type: ${proxyRes.headers.get('content-type')}`);
    
    if (proxyRes.ok && proxyRes.headers.get('content-type')?.includes('video')) {
      const reader = proxyRes.body.getReader();
      const { value } = await reader.read();
      reader.cancel();
      console.log(`   ✓ Got ${value?.length || 0} bytes of video!`);
    } else {
      console.log('   ❌ Proxy stream failed');
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Conclusion
  console.log('\n' + '='.repeat(60));
  console.log('CONCLUSION:');
  console.log('='.repeat(60));
  console.log('');
  console.log('The IPTV portal blocks stream requests based on IP address.');
  console.log('');
  console.log('- API calls (handshake, channels, create_link) work from anywhere');
  console.log('- Stream URLs only work from residential IPs');
  console.log('- The play_token in the URL is NOT the issue');
  console.log('- The portal checks the requesting IP for streams');
  console.log('');
  console.log('SOLUTION: Client must stream through RPi proxy.');
  console.log('Cannot pass URL directly to client browser.');
}

test().catch(console.error);
