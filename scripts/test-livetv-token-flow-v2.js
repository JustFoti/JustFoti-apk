/**
 * Test the LiveTV token flow end-to-end with detailed output
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function testFlow() {
  console.log('=== Testing LiveTV Token Flow ===\n');
  
  // Step 1: Get tokenized URL from CF worker
  console.log('Step 1: Requesting channel from CF worker...');
  
  const channelRequest = {
    portal: 'http://line.protv.cc/c/',
    mac: process.env.STALKER_MAC_ADDRESS || '00:1A:79:00:00:01',
    stalkerChannelId: '203', // ESPN
    channelId: 'espn',
    channelName: 'ESPN',
  };
  
  const channelResponse = await fetch(`${CF_PROXY_URL}/iptv/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channelRequest),
  });
  
  const channelData = await channelResponse.json();
  
  if (!channelData.success || !channelData.streamUrl) {
    console.error('Failed to get stream URL:', channelData);
    return;
  }
  
  const streamUrl = channelData.streamUrl;
  console.log('Got tokenized URL:', streamUrl);
  
  // Extract token
  const token = new URL(streamUrl).searchParams.get('t');
  console.log('Token:', token);
  
  // Step 2: Immediately fetch the stream (no delay)
  console.log('\nStep 2: Fetching stream immediately...');
  
  const streamResponse = await fetch(streamUrl);
  
  console.log('Status:', streamResponse.status);
  
  if (!streamResponse.ok) {
    const errorBody = await streamResponse.text();
    console.error('Error:', errorBody);
    
    // Try to parse as JSON
    try {
      const errorJson = JSON.parse(errorBody);
      console.error('Parsed error:', errorJson);
    } catch {}
  } else {
    console.log('SUCCESS! Content-Type:', streamResponse.headers.get('content-type'));
  }
}

testFlow().catch(console.error);
