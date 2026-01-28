const CF_URL = 'https://media-proxy.vynx.workers.dev';

const TEST_CHANNELS = [
  { id: '35', name: 'Sky Sports Football [UK]' },
  { id: '44', name: 'ESPN [USA]' },
  { id: '130', name: 'Sky Sports PL [UK]' },
  { id: '366', name: 'Sky Sports News [UK]' },
  { id: '425', name: 'beIN Sports USA' },
];

async function testChannel(channel) {
  const url = `${CF_URL}/tv/?channel=${channel.id}`;
  const start = Date.now();
  
  try {
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(20000),
      headers: { 'Origin': 'https://flyx.tv' }
    });
    
    if (!res.ok) return { ...channel, status: 'FAIL', error: `HTTP ${res.status}` };
    
    const text = await res.text();
    if (!text.startsWith('#EXTM3U')) return { ...channel, status: 'FAIL', error: 'Not M3U8' };
    
    // Check for AES key (dvalna.ru streams)
    const keyMatch = text.match(/#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/);
    if (!keyMatch) {
      // No key = unencrypted stream (cdn-live-tv.ru)
      return { ...channel, status: 'OK', backend: 'cdn-live', time: Date.now() - start };
    }
    
    // Fetch key
    const keyRes = await fetch(keyMatch[1], { 
      signal: AbortSignal.timeout(20000),
      headers: { 'Origin': 'https://flyx.tv' }
    });
    
    const keyData = await keyRes.arrayBuffer();
    if (keyData.byteLength === 16) {
      return { ...channel, status: 'OK', backend: 'dvalna', time: Date.now() - start };
    }
    
    const keyText = new TextDecoder().decode(keyData);
    return { ...channel, status: 'PARTIAL', error: keyText.substring(0, 50), time: Date.now() - start };
  } catch (e) {
    return { ...channel, status: 'FAIL', error: e.message };
  }
}


async function main() {
  console.log('Testing channels via CF Worker + RPI Proxy...\n');
  
  for (const channel of TEST_CHANNELS) {
    process.stdout.write(`Testing ${channel.id.padStart(3)} ${channel.name.padEnd(28)}... `);
    const result = await testChannel(channel);
    
    if (result.status === 'OK') {
      console.log(`✅ ${result.time}ms [${result.backend}]`);
    } else if (result.status === 'PARTIAL') {
      console.log(`⚠️  ${result.error}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }
}

main();
