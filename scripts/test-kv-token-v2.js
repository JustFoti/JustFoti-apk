/**
 * Test the KV token flow with detailed output
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function testFlow() {
  console.log('=== Testing KV Token Flow ===\n');
  
  // Step 1: Create a channel request to get a token
  console.log('Step 1: Creating channel request...');
  
  const channelRequest = {
    portal: 'http://line.protv.cc/c/',
    mac: process.env.STALKER_MAC_ADDRESS || '00:1A:79:00:00:01',
    stalkerChannelId: '203',
    channelId: 'espn',
    channelName: 'ESPN',
  };
  
  const channelResponse = await fetch(`${CF_PROXY_URL}/iptv/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channelRequest),
  });
  
  const channelData = await channelResponse.json();
  console.log('Channel response:', JSON.stringify(channelData, null, 2));
  
  if (!channelData.success || !channelData.streamUrl) {
    console.error('Failed to get stream URL');
    return;
  }
  
  // Extract token from URL
  const tokenUrl = new URL(channelData.streamUrl);
  const token = tokenUrl.searchParams.get('t');
  console.log('\nToken:', token);
  console.log('Full stream URL:', channelData.streamUrl);
  
  // Step 2: Wait a moment then fetch the stream
  console.log('\nStep 2: Waiting 1 second then fetching stream...');
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Fetching:', channelData.streamUrl);
  
  const streamResponse = await fetch(channelData.streamUrl, {
    method: 'GET',
    headers: {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  
  console.log('\nStream response:');
  console.log('  Status:', streamResponse.status);
  console.log('  Content-Type:', streamResponse.headers.get('content-type'));
  
  if (!streamResponse.ok) {
    const body = await streamResponse.text();
    console.log('  Error body:', body);
  } else {
    console.log('  SUCCESS!');
    // Read first few bytes
    const reader = streamResponse.body.getReader();
    const { value } = await reader.read();
    reader.cancel();
    if (value) {
      console.log('  First 20 bytes:', Array.from(value.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
      if (value[0] === 0x47) {
        console.log('  Confirmed MPEG-TS stream (sync byte 0x47)');
      }
    }
  }
}

testFlow().catch(console.error);
