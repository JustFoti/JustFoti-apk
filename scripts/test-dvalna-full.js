/**
 * Test full dvalna.ru stream flow
 */

const CF_URL = 'https://media-proxy.vynx.workers.dev';

async function main() {
  console.log('=== Testing dvalna.ru full flow ===\n');
  
  // Get M3U8 for channel 366 (Sky Sports News - uses dvalna)
  console.log('1. Getting M3U8 for channel 366...');
  const m3u8Res = await fetch(`${CF_URL}/tv?channel=366`, {
    headers: { 'Origin': 'https://flyx.tv' },
  });
  const m3u8 = await m3u8Res.text();
  console.log('   Status:', m3u8Res.status);
  console.log('   M3U8 preview:');
  console.log(m3u8.substring(0, 600));
  
  // Extract key URL
  const keyMatch = m3u8.match(/#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/);
  if (keyMatch) {
    console.log('\n2. Testing key fetch...');
    console.log('   Key URL:', keyMatch[1].substring(0, 70) + '...');
    
    const keyRes = await fetch(keyMatch[1], {
      headers: { 'Origin': 'https://flyx.tv' },
    });
    const keyData = await keyRes.arrayBuffer();
    console.log('   Status:', keyRes.status);
    console.log('   Size:', keyData.byteLength);
    
    if (keyData.byteLength === 16) {
      console.log('   ✅ Key OK:', Buffer.from(keyData).toString('hex'));
    } else {
      const text = new TextDecoder().decode(keyData);
      console.log('   ❌ Key error:', text.substring(0, 200));
    }
  }
  
  // Extract segment URLs
  const segmentUrls = m3u8.split('\n').filter(l => l.startsWith('https://chevy.dvalna.ru'));
  if (segmentUrls.length > 0) {
    console.log('\n3. Testing segment fetch (direct to dvalna)...');
    console.log('   Segment URL:', segmentUrls[0].substring(0, 70) + '...');
    
    const segRes = await fetch(segmentUrls[0], {
      headers: { 
        'Origin': 'https://flyx.tv',
        'Referer': 'https://topembed.pw/',
      },
    });
    const segData = await segRes.arrayBuffer();
    console.log('   Status:', segRes.status);
    console.log('   Size:', segData.byteLength);
    
    if (segData.byteLength > 10000) {
      console.log('   ✅ Segment OK');
    } else {
      const text = new TextDecoder().decode(segData);
      console.log('   ❌ Segment error:', text.substring(0, 200));
    }
  }
  
  console.log('\n=== Summary ===');
  console.log('dvalna.ru segments are fetched DIRECTLY by the browser');
  console.log('Only the KEY needs to go through the proxy (for PoW auth)');
}

main();
