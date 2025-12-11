/**
 * Test just the stream fetch with a fresh token
 */

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function test() {
  // Create token
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
  console.log('Token URL:', channelData.streamUrl);
  
  // Wait 2 seconds
  console.log('Waiting 2 seconds...');
  await new Promise(r => setTimeout(r, 2000));
  
  // Fetch stream
  console.log('Fetching stream...');
  const streamRes = await fetch(channelData.streamUrl);
  console.log('Status:', streamRes.status);
  
  if (!streamRes.ok) {
    const body = await streamRes.text();
    console.log('Error:', body);
  } else {
    console.log('SUCCESS!');
  }
}

test().catch(console.error);
