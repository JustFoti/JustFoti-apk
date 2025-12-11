/**
 * Test the KV token storage and retrieval
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function testKVToken() {
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
  
  // Step 2: Immediately try to fetch the stream
  console.log('\nStep 2: Fetching stream with token...');
  
  const streamResponse = await fetch(channelData.streamUrl, {
    method: 'GET',
    headers: {
      'Accept': '*/*',
    },
  });
  
  console.log('Stream status:', streamResponse.status);
  console.log('Stream headers:', Object.fromEntries(streamResponse.headers.entries()));
  
  if (!streamResponse.ok) {
    const body = await streamResponse.text();
    console.log('Error body:', body);
  } else {
    console.log('SUCCESS!');
    // Read first few bytes
    const reader = streamResponse.body.getReader();
    const { value } = await reader.read();
    reader.cancel();
    if (value) {
      console.log('First 20 bytes:', Array.from(value.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }
  }
}

testKVToken().catch(console.error);
