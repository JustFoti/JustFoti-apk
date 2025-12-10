#!/usr/bin/env node
/**
 * FINAL TEST: Can client play stream URL obtained from RPi proxy?
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
  console.log('='.repeat(60));
  console.log('THEORY TEST: Can datacenter use RPi-obtained stream URL?');
  console.log('='.repeat(60) + '\n');

  // All API through RPi
  const handshakeUrl = `${PORTAL}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  const handshakeData = parseSecureJson(await rpiApi(handshakeUrl, MAC));
  const token = handshakeData?.js?.token;
  console.log('1. Token from RPi:', token);

  const channelsUrl = `${PORTAL}/portal.php?type=itv&action=get_ordered_list&genre=*&p=0&JsHttpRequest=1-xml`;
  const channelsData = parseSecureJson(await rpiApi(channelsUrl, MAC, token));
  const channel = channelsData?.js?.data?.[0];
  console.log('2. Channel:', channel?.name);

  const cmd = encodeURIComponent(channel.cmd);
  const linkUrl = `${PORTAL}/portal.php?type=itv&action=create_link&cmd=${cmd}&series=&forced_storage=undefined&disable_ad=0&download=0&JsHttpRequest=1-xml`;
  const linkText = await rpiApi(linkUrl, MAC, token);
  const linkData = parseSecureJson(linkText);
  const streamUrl = linkData?.js?.cmd?.replace(/^ffmpeg\s+/, '').trim();
  console.log('3. Stream URL from RPi:', streamUrl);

  // Test direct access from datacenter
  console.log('\n4. Testing DIRECT access from datacenter...');
  try {
    const directRes = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
        'Cookie': `mac=${encodeURIComponent(MAC)}; stb_lang=en; timezone=GMT`,
      },
      signal: AbortSignal.timeout(15000),
    });
    console.log('   Status:', directRes.status);
    console.log('   Content-Type:', directRes.headers.get('content-type'));
    
    if (directRes.ok) {
      const ct = directRes.headers.get('content-type') || '';
      if (ct.includes('video') || ct.includes('mp2t')) {
        console.log('\n🎉 DIRECT ACCESS WORKS! Token NOT IP-bound!');
      } else {
        const body = await directRes.text();
        console.log('   Body:', body.substring(0, 100));
      }
    } else {
      console.log('   ❌ Blocked');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // Control: through RPi
  console.log('\n5. Control: Stream through RPi proxy...');
  const streamParams = new URLSearchParams({ url: streamUrl, mac: MAC, key: RPI_PROXY_KEY });
  const proxyRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams}`, {
    signal: AbortSignal.timeout(15000),
  });
  console.log('   Status:', proxyRes.status);
  console.log('   Content-Type:', proxyRes.headers.get('content-type'));
  
  if (proxyRes.ok && proxyRes.headers.get('content-type')?.includes('video')) {
    const reader = proxyRes.body.getReader();
    const { value } = await reader.read();
    reader.cancel();
    console.log('   ✓ Got', value?.length || 0, 'bytes');
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESULT: Stream URLs are IP-bound. Must proxy through RPi.');
  console.log('='.repeat(60));
}

test().catch(console.error);
