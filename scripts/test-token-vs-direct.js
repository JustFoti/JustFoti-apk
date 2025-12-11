/**
 * Test script to compare tokenized vs direct (non-tokenized) stream flows
 * This will help identify why tokenized flow returns 403 while direct works
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';
const PORTAL_URL = 'http://line.protv.cc/c/';
const MAC_ADDRESS = process.env.TEST_MAC || '00:1A:79:00:00:01';
const TEST_CHANNEL_ID = '203'; // A known working channel

async function testTokenizedFlow() {
  console.log('\n=== TESTING TOKENIZED FLOW ===');
  console.log('Portal:', PORTAL_URL);
  console.log('MAC:', MAC_ADDRESS);
  console.log('Channel:', TEST_CHANNEL_ID);
  
  try {
    // Step 1: Call /iptv/channel to get tokenized URL
    console.log('\n1. Calling /iptv/channel...');
    const channelRes = await fetch(`${CF_PROXY_URL}/iptv/channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portal: PORTAL_URL,
        mac: MAC_ADDRESS,
        stalkerChannelId: TEST_CHANNEL_ID,
        channelId: 'test-channel',
        channelName: 'Test Channel',
      }),
    });
    
    const channelData = await channelRes.json();
    console.log('Channel response:', JSON.stringify(channelData, null, 2));
    
    if (!channelData.success || !channelData.streamUrl) {
      console.error('Failed to get tokenized URL');
      return;
    }
    
    const tokenizedUrl = channelData.streamUrl;
    console.log('\n2. Got tokenized URL:', tokenizedUrl);
    
    // Step 2: Try to fetch the stream using the tokenized URL
    console.log('\n3. Fetching stream via tokenized URL...');
    const streamRes = await fetch(tokenizedUrl, {
      headers: {
        'Accept': '*/*',
      },
    });
    
    console.log('Stream response status:', streamRes.status);
    console.log('Stream response headers:', Object.fromEntries(streamRes.headers.entries()));
    
    if (!streamRes.ok) {
      const errorBody = await streamRes.text();
      console.error('Stream fetch failed:', errorBody.substring(0, 500));
    } else {
      console.log('SUCCESS! Stream is accessible');
      // Read a small chunk to verify
      const reader = streamRes.body.getReader();
      const { value } = await reader.read();
      console.log('First chunk size:', value?.length || 0, 'bytes');
      reader.cancel();
    }
    
  } catch (error) {
    console.error('Tokenized flow error:', error);
  }
}

async function testDirectFlow() {
  console.log('\n=== TESTING DIRECT (NON-TOKENIZED) FLOW ===');
  console.log('Portal:', PORTAL_URL);
  console.log('MAC:', MAC_ADDRESS);
  console.log('Channel:', TEST_CHANNEL_ID);
  
  try {
    // Step 1: Do handshake to get portal token
    console.log('\n1. Doing handshake...');
    const portalBase = PORTAL_URL.replace(/\/c\/?$/, '').replace(/\/+$/, '');
    const handshakeUrl = `${portalBase}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
    
    const handshakeParams = new URLSearchParams({ url: handshakeUrl, mac: MAC_ADDRESS });
    const handshakeRes = await fetch(`${CF_PROXY_URL}/iptv/api?${handshakeParams}`);
    const handshakeText = await handshakeRes.text();
    const handshakeClean = handshakeText.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
    const handshakeData = JSON.parse(handshakeClean);
    
    if (!handshakeData?.js?.token) {
      console.error('Handshake failed:', handshakeData);
      return;
    }
    
    const portalToken = handshakeData.js.token;
    console.log('Got portal token:', portalToken.substring(0, 30) + '...');
    
    // Step 2: Create link to get stream URL
    console.log('\n2. Creating link...');
    const cmd = `ffrt http://localhost/ch/${TEST_CHANNEL_ID}`;
    const createLinkUrl = new URL(`${portalBase}/portal.php`);
    createLinkUrl.searchParams.set('type', 'itv');
    createLinkUrl.searchParams.set('action', 'create_link');
    createLinkUrl.searchParams.set('cmd', cmd);
    createLinkUrl.searchParams.set('series', '');
    createLinkUrl.searchParams.set('forced_storage', 'undefined');
    createLinkUrl.searchParams.set('disable_ad', '0');
    createLinkUrl.searchParams.set('download', '0');
    createLinkUrl.searchParams.set('JsHttpRequest', '1-xml');
    
    const createLinkParams = new URLSearchParams({ 
      url: createLinkUrl.toString(), 
      mac: MAC_ADDRESS,
      token: portalToken,
    });
    const createLinkRes = await fetch(`${CF_PROXY_URL}/iptv/api?${createLinkParams}`);
    const createLinkText = await createLinkRes.text();
    const createLinkClean = createLinkText.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
    const createLinkData = JSON.parse(createLinkClean);
    
    let streamUrl = createLinkData?.js?.cmd;
    if (!streamUrl) {
      console.error('Create link failed:', createLinkData);
      return;
    }
    
    // Extract URL from ffmpeg command format
    const prefixes = ['ffmpeg ', 'ffrt ', 'ffrt2 ', 'ffrt3 ', 'ffrt4 '];
    for (const prefix of prefixes) {
      if (streamUrl.startsWith(prefix)) {
        streamUrl = streamUrl.substring(prefix.length);
        break;
      }
    }
    streamUrl = streamUrl.trim();
    
    console.log('Got stream URL:', streamUrl);
    
    // Step 3: Fetch stream via CF proxy using direct URL (not tokenized)
    console.log('\n3. Fetching stream via direct URL...');
    const streamParams = new URLSearchParams({ url: streamUrl, mac: MAC_ADDRESS });
    const directStreamUrl = `${CF_PROXY_URL}/iptv/stream?${streamParams}`;
    console.log('Direct stream URL:', directStreamUrl.substring(0, 100) + '...');
    
    const streamRes = await fetch(directStreamUrl, {
      headers: {
        'Accept': '*/*',
      },
    });
    
    console.log('Stream response status:', streamRes.status);
    console.log('Stream response headers:', Object.fromEntries(streamRes.headers.entries()));
    
    if (!streamRes.ok) {
      const errorBody = await streamRes.text();
      console.error('Stream fetch failed:', errorBody.substring(0, 500));
    } else {
      console.log('SUCCESS! Stream is accessible');
      // Read a small chunk to verify
      const reader = streamRes.body.getReader();
      const { value } = await reader.read();
      console.log('First chunk size:', value?.length || 0, 'bytes');
      reader.cancel();
    }
    
  } catch (error) {
    console.error('Direct flow error:', error);
  }
}

async function main() {
  console.log('Testing IPTV stream flows...');
  console.log('CF Proxy:', CF_PROXY_URL);
  
  await testTokenizedFlow();
  await testDirectFlow();
  
  console.log('\n=== DONE ===');
}

main().catch(console.error);
