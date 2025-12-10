#!/usr/bin/env node
/**
 * Test with alternative portal
 */

const RPI_PROXY_URL = 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

// Try different portal
const PORTAL = 'http://line.stayconnected.pro';
const MAC = '00:1A:79:00:00:00';

function parseSecureJson(text) {
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try { return JSON.parse(clean); } catch { return null; }
}

async function rpiApi(url, mac, token = null) {
  const params = new URLSearchParams({ url, mac, key: RPI_PROXY_KEY });
  if (token) params.set('token', token);
  const res = await fetch(`${RPI_PROXY_URL}/iptv/api?${params}`, { signal: AbortSignal.timeout(20000) });
  return res.text();
}

async function test() {
  console.log('Testing portal:', PORTAL);
  console.log('MAC:', MAC, '\n');

  try {
    // Handshake
    console.log('1. Handshake...');
    const handshakeUrl = `${PORTAL}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
    const handshakeText = await rpiApi(handshakeUrl, MAC);
    console.log('   Response:', handshakeText.substring(0, 100));
    const handshakeData = parseSecureJson(handshakeText);
    const token = handshakeData?.js?.token;
    if (!token) { console.log('   ❌ No token'); return; }
    console.log('   ✓ Token:', token);

    // Channels
    console.log('\n2. Get channels...');
    const channelsUrl = `${PORTAL}/portal.php?type=itv&action=get_ordered_list&genre=*&p=0&JsHttpRequest=1-xml`;
    const channelsText = await rpiApi(channelsUrl, MAC, token);
    const channelsData = parseSecureJson(channelsText);
    const channels = channelsData?.js?.data || [];
    console.log('   Found:', channels.length, 'channels');
    if (!channels.length) return;

    const channel = channels.find(c => c.name?.includes('ESPN')) || channels[0];
    console.log('   Using:', channel.name);

    // Create link
    console.log('\n3. Create link...');
    const cmd = encodeURIComponent(channel.cmd);
    const linkUrl = `${PORTAL}/portal.php?type=itv&action=create_link&cmd=${cmd}&series=&forced_storage=undefined&disable_ad=0&download=0&JsHttpRequest=1-xml`;
    const linkText = await rpiApi(linkUrl, MAC, token);
    console.log('   Response:', linkText.substring(0, 200));
    const linkData = parseSecureJson(linkText);
    const streamUrl = linkData?.js?.cmd?.replace(/^ffmpeg\s+/, '').trim();
    if (!streamUrl) { console.log('   ❌ No stream URL'); return; }
    console.log('   ✓ Stream URL:', streamUrl.substring(0, 80));

    // Stream through proxy
    console.log('\n4. Stream through RPi...');
    const streamParams = new URLSearchParams({ url: streamUrl, mac: MAC, key: RPI_PROXY_KEY });
    const proxyRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams}`, {
      signal: AbortSignal.timeout(20000),
    });
    console.log('   Status:', proxyRes.status);
    console.log('   Content-Type:', proxyRes.headers.get('content-type'));

    if (proxyRes.ok) {
      const ct = proxyRes.headers.get('content-type') || '';
      if (ct.includes('video') || ct.includes('mp2t')) {
        const reader = proxyRes.body.getReader();
        const { value } = await reader.read();
        reader.cancel();
        console.log('   ✓ Got', value?.length, 'bytes of video!');

        // Now test direct
        console.log('\n5. Test DIRECT from datacenter...');
        try {
          const directRes = await fetch(streamUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C)',
              'Cookie': `mac=${encodeURIComponent(MAC)}`,
            },
            signal: AbortSignal.timeout(15000),
          });
          console.log('   Status:', directRes.status);
          if (directRes.ok) {
            console.log('   🎉 DIRECT WORKS!');
          } else {
            console.log('   ❌ Blocked');
          }
        } catch (e) {
          console.log('   ❌', e.message);
        }
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

test();
