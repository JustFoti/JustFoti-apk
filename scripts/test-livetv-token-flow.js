/**
 * Test the LiveTV token flow end-to-end
 * 1. Call xfinity-stream API to get tokenized URL
 * 2. Try to fetch the stream from the tokenized URL
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
  
  console.log('Request:', JSON.stringify(channelRequest, null, 2));
  
  const channelResponse = await fetch(`${CF_PROXY_URL}/iptv/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channelRequest),
  });
  
  const channelData = await channelResponse.json();
  console.log('\nChannel response:', JSON.stringify(channelData, null, 2));
  
  if (!channelData.success || !channelData.streamUrl) {
    console.error('Failed to get stream URL!');
    return;
  }
  
  const streamUrl = channelData.streamUrl;
  console.log('\nTokenized stream URL:', streamUrl);
  
  // Step 2: Try to fetch the stream
  console.log('\nStep 2: Fetching stream from tokenized URL...');
  
  // Small delay to simulate real usage
  await new Promise(r => setTimeout(r, 500));
  
  const streamResponse = await fetch(streamUrl, {
    headers: {
      'Accept': '*/*',
    },
  });
  
  console.log('Stream response status:', streamResponse.status);
  console.log('Stream response headers:', Object.fromEntries(streamResponse.headers.entries()));
  
  if (streamResponse.ok) {
    const contentType = streamResponse.headers.get('content-type');
    console.log('\n✅ SUCCESS! Stream is accessible');
    console.log('Content-Type:', contentType);
    
    // Read a small chunk to verify it's video data
    const reader = streamResponse.body.getReader();
    const { value } = await reader.read();
    reader.cancel();
    
    if (value) {
      console.log('First bytes:', value.slice(0, 20));
      // MPEG-TS sync byte is 0x47
      if (value[0] === 0x47) {
        console.log('✅ Confirmed MPEG-TS stream (sync byte 0x47)');
      }
    }
  } else {
    console.error('\n❌ FAILED! Stream returned:', streamResponse.status);
    const errorText = await streamResponse.text();
    console.error('Error body:', errorText.substring(0, 500));
  }
}

testFlow().catch(console.error);
