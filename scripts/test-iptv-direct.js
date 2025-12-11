/**
 * Test IPTV stream directly with verbose output
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function test() {
  // First create a token
  console.log('Creating token...');
  const channelRes = await fetch(`${CF_PROXY_URL}/iptv/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      portal: 'http://line.protv.cc/c/',
      mac: '00:1A:79:00:00:01',
      stalkerChannelId: '203',
      channelId: 'espn',
      channelName: 'ESPN',
    }),
  });
  
  const channelData = await channelRes.json();
  console.log('Token created:', channelData.streamUrl);
  
  // Extract token
  const token = new URL(channelData.streamUrl).searchParams.get('t');
  
  // Now fetch the stream
  console.log('\nFetching stream with token:', token);
  const streamRes = await fetch(`${CF_PROXY_URL}/iptv/stream?t=${token}`);
  
  console.log('Status:', streamRes.status);
  console.log('Headers:', Object.fromEntries(streamRes.headers.entries()));
  
  const body = await streamRes.text();
  console.log('Body:', body.substring(0, 500));
}

test().catch(console.error);
