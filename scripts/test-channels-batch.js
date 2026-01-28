const CF_URL = 'https://media-proxy.vynx.workers.dev';

// Test a variety of channels
const TEST_CHANNELS = [
  { id: '35', name: 'Sky Sports Football [UK]' },
  { id: '44', name: 'ESPN [USA]' },
  { id: '51', name: 'ABC [USA]' },
  { id: '130', name: 'Sky Sports PL [UK]' },
  { id: '349', name: 'BBC News [UK]' },
  { id: '366', name: 'Sky Sports News [UK]' },
  { id: '425', name: 'beIN Sports USA' },
  { id: '426', name: 'DAZN1 [Germany]' },
];

async function testChannel(channel) {
  const url = `${CF_URL}/tv/?channel=${channel.id}`;
  const start = Date.now();
  
  try {
    // Get M3U8
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(15000),
      headers: { 
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/',
      }
    });
    const m3u8Time = Date.now() - start;
    
    if (!res.ok) {
      const text = await res.text();
      return { ...channel, status: 'FAIL', error: `HTTP ${res.status}`, time: m3u8Time };
    }
    
    const m3u8Content = await res.text();
    if (!m3u8Content.startsWith('#EXTM3U')) {
      return { ...channel, status: 'FAIL', error: 'Not M3U8', time: m3u8Time };
    }
    
    // Extract key URL
    const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
    if (!keyMatch) {
      return { ...channel, status: 'OK', note: 'no-key', time: m3u8Time };
    }
    
    // Fetch key
    const keyRes = await fetch(keyMatch[1], { 
      signal: AbortSignal.timeout(15000),
      headers: { 
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/',
      }
    });
    const totalTime = Date.now() - start;
    
    const keyData = await keyRes.arrayBuffer();
    if (keyData.byteLength === 16) {
      return { ...channel, status: 'OK', keyStatus: 'valid', time: totalTime };
    } else {
      const keyText = new TextDecoder().decode(keyData);
      return { ...channel, status: 'PARTIAL', keyStatus: 'invalid', keyError: keyText.substring(0, 50), time: totalTime };
    }
  } catch (e) {
    return { ...channel, status: 'FAIL', error: e.message, time: Date.now() - start };
  }
}

async function main() {
  console.log('Testing channels via CF Worker + RPI Proxy...\n');
  
  const results = [];
  for (const channel of TEST_CHANNELS) {
    process.stdout.write(`Testing ${channel.id.padStart(3)} ${channel.name.padEnd(30)}... `);
    const result = await testChannel(channel);
    
    if (result.status === 'OK') {
      console.log(`✅ ${result.time}ms ${result.keyStatus || result.note || ''}`);
    } else if (result.status === 'PARTIAL') {
      console.log(`⚠️  ${result.time}ms key: ${result.keyError}`);
    } else {
      console.log(`❌ ${result.time}ms ${result.error}`);
    }
    
    results.push(result);
  }
  
  console.log('\n=== Summary ===');
  const ok = results.filter(r => r.status === 'OK').length;
  const partial = results.filter(r => r.status === 'PARTIAL').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`OK: ${ok}, Partial: ${partial}, Failed: ${fail}`);
}

main();
