/**
 * Test cdn-live-tv.ru segment fetching
 */

const CF_URL = 'https://media-proxy.vynx.workers.dev';
const RPI_URL = 'https://rpi-proxy.vynx.cc';
const RPI_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

async function main() {
  // Get fresh M3U8 for channel 35
  console.log('1. Getting M3U8 for channel 35...');
  const m3u8Res = await fetch(`${CF_URL}/tv?channel=35`, {
    headers: { 'Origin': 'https://flyx.tv' },
  });
  const m3u8 = await m3u8Res.text();
  console.log('   M3U8 preview:', m3u8.substring(0, 300));
  
  // Find the variant manifest URL
  const variantMatch = m3u8.match(/https:\/\/media-proxy[^\s]+\.m3u8[^\s]*/);
  if (!variantMatch) {
    console.log('   No variant URL found');
    return;
  }
  
  console.log('\n2. Getting variant manifest...');
  console.log('   URL:', variantMatch[0].substring(0, 80));
  
  const variantRes = await fetch(variantMatch[0], {
    headers: { 'Origin': 'https://flyx.tv' },
  });
  const variant = await variantRes.text();
  console.log('   Variant preview:', variant.substring(0, 500));
  
  // Find segment URL
  const segmentMatch = variant.match(/https:\/\/media-proxy[^\s]+segment[^\s]*/);
  if (!segmentMatch) {
    console.log('   No segment URL found');
    return;
  }
  
  console.log('\n3. Testing segment via CF proxy...');
  console.log('   URL:', segmentMatch[0].substring(0, 80));
  
  const segRes = await fetch(segmentMatch[0], {
    headers: { 'Origin': 'https://flyx.tv' },
  });
  const segData = await segRes.arrayBuffer();
  console.log('   Status:', segRes.status);
  console.log('   Size:', segData.byteLength);
  
  if (segData.byteLength < 1000) {
    const text = new TextDecoder().decode(segData);
    console.log('   Response:', text);
  }
  
  // Extract the actual CDN URL and test directly
  const urlParam = new URL(segmentMatch[0]).searchParams.get('url');
  if (urlParam) {
    const cdnUrl = decodeURIComponent(urlParam);
    console.log('\n4. Testing CDN URL directly...');
    console.log('   URL:', cdnUrl.substring(0, 80));
    
    try {
      const directRes = await fetch(cdnUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://cdn-live.tv/',
        },
        signal: AbortSignal.timeout(10000),
      });
      const directData = await directRes.arrayBuffer();
      console.log('   Status:', directRes.status);
      console.log('   Size:', directData.byteLength);
      
      if (directData.byteLength > 1000) {
        console.log('   ✅ Direct fetch works!');
      }
    } catch (e) {
      console.log('   Error:', e.message);
    }
    
    console.log('\n5. Testing via RPI proxy...');
    const rpiUrl = `${RPI_URL}/animekai?url=${encodeURIComponent(cdnUrl)}&key=${RPI_KEY}&referer=${encodeURIComponent('https://cdn-live.tv/')}`;
    
    try {
      const rpiRes = await fetch(rpiUrl, { signal: AbortSignal.timeout(10000) });
      const rpiData = await rpiRes.arrayBuffer();
      console.log('   Status:', rpiRes.status);
      console.log('   Size:', rpiData.byteLength);
      
      if (rpiData.byteLength > 1000) {
        console.log('   ✅ RPI fetch works!');
      } else {
        const text = new TextDecoder().decode(rpiData);
        console.log('   Response:', text.substring(0, 200));
      }
    } catch (e) {
      console.log('   Error:', e.message);
    }
  }
}

main();
