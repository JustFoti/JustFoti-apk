/**
 * Compare tokenized vs non-tokenized flow
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function test() {
  // Step 1: Do handshake + create_link manually to get the raw stream URL
  console.log('=== Getting raw stream URL ===');
  
  const portalBase = 'http://line.protv.cc';
  const mac = '00:1A:79:00:00:01';
  
  // Handshake
  const handshakeUrl = `${portalBase}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  const handshakeRes = await fetch(`${CF_PROXY_URL}/iptv/api?url=${encodeURIComponent(handshakeUrl)}&mac=${encodeURIComponent(mac)}`);
  const handshakeText = await handshakeRes.text();
  const handshakeClean = handshakeText.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  const handshakeData = JSON.parse(handshakeClean);
  const portalToken = handshakeData?.js?.token;
  console.log('Portal token:', portalToken);
  
  // Create link
  const cmd = `ffrt http://localhost/ch/203`;
  const createLinkUrl = new URL(`${portalBase}/portal.php`);
  createLinkUrl.searchParams.set('type', 'itv');
  createLinkUrl.searchParams.set('action', 'create_link');
  createLinkUrl.searchParams.set('cmd', cmd);
  createLinkUrl.searchParams.set('series', '');
  createLinkUrl.searchParams.set('forced_storage', 'undefined');
  createLinkUrl.searchParams.set('disable_ad', '0');
  createLinkUrl.searchParams.set('download', '0');
  createLinkUrl.searchParams.set('JsHttpRequest', '1-xml');
  
  const createLinkRes = await fetch(`${CF_PROXY_URL}/iptv/api?url=${encodeURIComponent(createLinkUrl.toString())}&mac=${encodeURIComponent(mac)}&token=${encodeURIComponent(portalToken)}`);
  const createLinkText = await createLinkRes.text();
  const createLinkClean = createLinkText.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  const createLinkData = JSON.parse(createLinkClean);
  let rawStreamUrl = createLinkData?.js?.cmd;
  
  // Extract URL from ffmpeg command format
  const prefixes = ['ffmpeg ', 'ffrt ', 'ffrt2 ', 'ffrt3 ', 'ffrt4 '];
  for (const prefix of prefixes) {
    if (rawStreamUrl?.startsWith(prefix)) {
      rawStreamUrl = rawStreamUrl.substring(prefix.length);
      break;
    }
  }
  rawStreamUrl = rawStreamUrl?.trim();
  console.log('Raw stream URL:', rawStreamUrl);
  
  // Step 2: Test NON-TOKENIZED flow (legacy URL params)
  console.log('\n=== Testing NON-TOKENIZED flow ===');
  const legacyUrl = `${CF_PROXY_URL}/iptv/stream?url=${encodeURIComponent(rawStreamUrl)}&mac=${encodeURIComponent(mac)}`;
  console.log('Legacy URL:', legacyUrl.substring(0, 120) + '...');
  
  const legacyRes = await fetch(legacyUrl);
  console.log('Legacy status:', legacyRes.status);
  if (legacyRes.ok) {
    console.log('Legacy SUCCESS!');
  } else {
    const body = await legacyRes.text();
    console.log('Legacy error:', body);
  }
  
  // Step 3: Test TOKENIZED flow
  console.log('\n=== Testing TOKENIZED flow ===');
  const channelRes = await fetch(`${CF_PROXY_URL}/iptv/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      portal: 'http://line.protv.cc/c/',
      mac: mac,
      stalkerChannelId: '203',
      channelId: 'espn',
      channelName: 'ESPN',
    }),
  });
  
  const channelData = await channelRes.json();
  console.log('Token URL:', channelData.streamUrl);
  
  const tokenRes = await fetch(channelData.streamUrl);
  console.log('Token status:', tokenRes.status);
  if (tokenRes.ok) {
    console.log('Token SUCCESS!');
  } else {
    const body = await tokenRes.text();
    console.log('Token error:', body);
  }
}

test().catch(console.error);
