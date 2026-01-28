/**
 * Test live segment fetching - get fresh M3U8 and test segment
 */

const CF_URL = 'https://media-proxy.vynx.workers.dev';

async function testChannel(channelId, name) {
  console.log(`\n=== Testing ${channelId}: ${name} ===`);
  
  // Get M3U8
  const m3u8Url = `${CF_URL}/tv?channel=${channelId}`;
  const m3u8Res = await fetch(m3u8Url, {
    headers: { 'Origin': 'https://flyx.tv' },
    signal: AbortSignal.timeout(15000),
  });
  
  const m3u8 = await m3u8Res.text();
  if (!m3u8.startsWith('#EXTM3U')) {
    console.log('  ❌ Failed to get M3U8');
    return;
  }
  
  // Find segment URLs
  const lines = m3u8.split('\n');
  const segmentLines = lines.filter(l => l.startsWith('http') && !l.includes('.m3u8'));
  
  if (segmentLines.length === 0) {
    // Check for nested manifest
    const manifestLine = lines.find(l => l.includes('.m3u8') && l.startsWith('http'));
    if (manifestLine) {
      console.log('  ℹ️  Multi-variant playlist, fetching variant...');
      const variantRes = await fetch(manifestLine, {
        headers: { 'Origin': 'https://flyx.tv' },
        signal: AbortSignal.timeout(10000),
      });
      const variantM3u8 = await variantRes.text();
      const variantSegments = variantM3u8.split('\n').filter(l => l.startsWith('http') && !l.includes('.m3u8'));
      if (variantSegments.length > 0) {
        await testSegment(variantSegments[0], 'variant segment');
      }
    }
    return;
  }
  
  // Test first segment
  await testSegment(segmentLines[0], 'direct segment');
}

async function testSegment(url, label) {
  console.log(`  Testing ${label}:`);
  console.log(`    URL: ${url.substring(0, 70)}...`);
  
  try {
    const start = Date.now();
    const res = await fetch(url, {
      headers: { 
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    const elapsed = Date.now() - start;
    const data = await res.arrayBuffer();
    const firstByte = new Uint8Array(data)[0];
    
    console.log(`    Status: ${res.status}, Size: ${data.byteLength}, First: 0x${firstByte.toString(16)} (${elapsed}ms)`);
    
    if (res.status === 200 && (firstByte === 0x47 || data.byteLength > 1000)) {
      console.log(`    ✅ Segment OK`);
    } else {
      const preview = new TextDecoder().decode(data.slice(0, 200));
      console.log(`    ❌ Bad segment: ${preview.substring(0, 100)}`);
    }
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
  }
}

async function main() {
  await testChannel('35', 'Sky Sports Football');
  await testChannel('366', 'Sky Sports News');
}

main();
