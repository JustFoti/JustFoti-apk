/**
 * Test key endpoint specifically with retries
 */

async function testKey() {
  const playerDomain = 'epicplayplay.cfd';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    'Referer': `https://${playerDomain}/`,
    'Origin': `https://${playerDomain}`,
  };

  // First get fresh M3U8 to get current key URL
  console.log('Fetching M3U8...');
  const m3u8Res = await fetch('https://zekonew.giokko.ru/zeko/premium769/mono.css', { headers });
  const m3u8 = await m3u8Res.text();
  const keyUrl = m3u8.match(/URI="([^"]+)"/)?.[1];
  console.log('Key URL:', keyUrl);

  if (!keyUrl) {
    console.log('No key URL found');
    return;
  }

  // Test key with retries
  for (let i = 0; i < 5; i++) {
    console.log(`\nAttempt ${i + 1}:`);
    
    const res = await fetch(keyUrl, { headers });
    console.log(`  Status: ${res.status}`);
    console.log(`  CORS: ${res.headers.get('access-control-allow-origin')}`);
    
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      console.log(`  Key length: ${buffer.byteLength} bytes`);
      console.log(`  Key hex: ${Buffer.from(buffer).toString('hex')}`);
      break;
    }
    
    if (res.status === 418) {
      console.log('  Rate limited, waiting 500ms...');
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

testKey().catch(console.error);
