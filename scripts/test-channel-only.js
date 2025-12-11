/**
 * Test just the channel request to see what stream URL is returned
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function testChannel() {
  console.log('=== Testing Channel Request ===\n');
  
  const channelRequest = {
    portal: 'http://line.protv.cc/c/',
    mac: process.env.STALKER_MAC_ADDRESS || '00:1A:79:00:00:01',
    stalkerChannelId: '203',
    channelId: 'espn',
    channelName: 'ESPN',
  };
  
  console.log('Request:', JSON.stringify(channelRequest, null, 2));
  
  const response = await fetch(`${CF_PROXY_URL}/iptv/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channelRequest),
  });
  
  const data = await response.json();
  console.log('\nResponse:', JSON.stringify(data, null, 2));
  
  // Now try to directly fetch the stream URL that was stored
  // We can't see the actual URL stored in KV, but we can test if the portal is working
  // by doing a manual handshake + create_link
  
  console.log('\n=== Manual Test ===');
  
  const portalBase = 'http://line.protv.cc';
  const mac = channelRequest.mac;
  
  // Handshake
  console.log('Doing handshake...');
  const handshakeUrl = `${portalBase}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  const handshakeRes = await fetch(`${CF_PROXY_URL}/iptv/api?url=${encodeURIComponent(handshakeUrl)}&mac=${encodeURIComponent(mac)}`);
  const handshakeText = await handshakeRes.text();
  console.log('Handshake response:', handshakeText.substring(0, 200));
  
  // Parse token
  const handshakeClean = handshakeText.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  const handshakeData = JSON.parse(handshakeClean);
  const portalToken = handshakeData?.js?.token;
  console.log('Portal token:', portalToken?.substring(0, 30) + '...');
  
  // Create link
  console.log('\nCreating link...');
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
  console.log('Create link response:', createLinkText.substring(0, 300));
  
  // Parse stream URL
  const createLinkClean = createLinkText.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  const createLinkData = JSON.parse(createLinkClean);
  let streamUrl = createLinkData?.js?.cmd;
  console.log('\nRaw stream URL:', streamUrl);
  
  // Extract URL from ffmpeg command format
  const prefixes = ['ffmpeg ', 'ffrt ', 'ffrt2 ', 'ffrt3 ', 'ffrt4 '];
  for (const prefix of prefixes) {
    if (streamUrl?.startsWith(prefix)) {
      streamUrl = streamUrl.substring(prefix.length);
      break;
    }
  }
  streamUrl = streamUrl?.trim();
  console.log('Clean stream URL:', streamUrl);
  
  // Now try to fetch the stream directly through CF proxy
  console.log('\n=== Testing Stream Fetch ===');
  const proxyStreamUrl = `${CF_PROXY_URL}/iptv/stream?url=${encodeURIComponent(streamUrl)}&mac=${encodeURIComponent(mac)}`;
  console.log('Proxy URL:', proxyStreamUrl.substring(0, 150) + '...');
  
  const streamRes = await fetch(proxyStreamUrl);
  console.log('Stream status:', streamRes.status);
  
  if (streamRes.ok) {
    console.log('SUCCESS! Stream is accessible');
    const reader = streamRes.body.getReader();
    const { value } = await reader.read();
    reader.cancel();
    if (value) {
      console.log('First bytes:', Array.from(value.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }
  } else {
    const body = await streamRes.text();
    console.log('Error:', body);
  }
}

testChannel().catch(console.error);
