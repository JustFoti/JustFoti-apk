/**
 * Test fetching the AES-128 decryption key
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testKeyFetch() {
  // First get a fresh key URL from a stream
  const { extractM3U8, getAvailableStreams } = require('./viprow-m3u8-extract.js');
  
  const streams = await getAvailableStreams();
  if (streams.length === 0) {
    console.log('No streams available');
    return;
  }
  
  console.log('Extracting stream:', streams[0].title);
  const result = await extractM3U8(streams[0].url);
  
  if (!result.success) {
    console.log('Failed to extract stream:', result.error);
    return;
  }
  
  console.log('\nM3U8 URL:', result.m3u8Url);
  console.log('Key URL:', result.keyUrl);
  
  if (!result.keyUrl) {
    console.log('No key URL found in manifest');
    return;
  }
  
  // Try to fetch the key
  console.log('\n--- Fetching decryption key ---');
  
  const keyRes = await fetch(result.keyUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Origin': 'https://casthill.net',
      'Referer': 'https://casthill.net/',
    },
  });
  
  console.log('Key response status:', keyRes.status);
  console.log('Key response headers:', Object.fromEntries(keyRes.headers.entries()));
  
  if (keyRes.ok) {
    const keyBuffer = await keyRes.arrayBuffer();
    const keyBytes = new Uint8Array(keyBuffer);
    console.log('\n✅ Key fetched successfully!');
    console.log('Key length:', keyBytes.length, 'bytes');
    console.log('Key (hex):', Buffer.from(keyBytes).toString('hex'));
  } else {
    const text = await keyRes.text();
    console.log('Key fetch failed:', text);
  }
  
  // Also test fetching a segment
  console.log('\n--- Testing segment fetch ---');
  
  // Parse manifest to get first segment URL
  const manifestLines = result.manifest.split('\n');
  let segmentUrl = null;
  for (const line of manifestLines) {
    if (line.startsWith('media-') && line.includes('.ts')) {
      // Construct full URL
      const baseUrl = result.m3u8Url.substring(0, result.m3u8Url.lastIndexOf('/') + 1);
      segmentUrl = baseUrl + line.trim();
      break;
    }
  }
  
  if (segmentUrl) {
    console.log('Segment URL:', segmentUrl);
    
    const segRes = await fetch(segmentUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': 'https://casthill.net',
        'Referer': 'https://casthill.net/',
      },
    });
    
    console.log('Segment response status:', segRes.status);
    
    if (segRes.ok) {
      const segBuffer = await segRes.arrayBuffer();
      console.log('✅ Segment fetched successfully!');
      console.log('Segment size:', segBuffer.byteLength, 'bytes');
    } else {
      console.log('Segment fetch failed');
    }
  }
}

testKeyFetch().catch(console.error);
