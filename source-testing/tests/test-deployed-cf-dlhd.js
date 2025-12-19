/**
 * Test the deployed Cloudflare Worker DLHD proxy
 */

const CF_URL = 'https://media-proxy.vynx.workers.dev';

async function test() {
  console.log('=== Testing Deployed CF Worker DLHD Proxy ===\n');
  console.log('Worker URL:', CF_URL);
  
  // Test 1: Health check
  console.log('\n1. Health check...');
  try {
    const healthRes = await fetch(CF_URL + '/dlhd/health');
    const health = await healthRes.json();
    console.log('   Status:', healthRes.status);
    console.log('   Response:', JSON.stringify(health, null, 2));
  } catch (e) {
    console.log('   ERROR:', e.message);
  }
  
  // Test 2: Fetch M3U8 for channel 51
  console.log('\n2. Fetching M3U8 for channel 51...');
  try {
    const m3u8Res = await fetch(CF_URL + '/dlhd?channel=51');
    const contentType = m3u8Res.headers.get('content-type');
    const text = await m3u8Res.text();
    console.log('   Status:', m3u8Res.status);
    console.log('   Content-Type:', contentType);
    console.log('   Server:', m3u8Res.headers.get('x-dlhd-server'));
    console.log('   Domain:', m3u8Res.headers.get('x-dlhd-domain'));
    
    if (text.includes('#EXTM3U')) {
      console.log('   ✅ Valid M3U8 received');
      console.log('   First 500 chars:\n', text.substring(0, 500));
      
      // Extract key URL
      const keyMatch = text.match(/URI="([^"]+)"/);
      if (keyMatch) {
        const keyUrl = keyMatch[1];
        console.log('\n   Key URL:', keyUrl);
        
        // Test 3: Fetch key
        console.log('\n3. Fetching encryption key...');
        const keyRes = await fetch(keyUrl);
        const keyData = await keyRes.arrayBuffer();
        console.log('   Status:', keyRes.status);
        console.log('   Size:', keyData.byteLength, 'bytes');
        console.log('   Fetched-By:', keyRes.headers.get('x-fetched-by'));
        
        if (keyData.byteLength === 16) {
          console.log('   ✅ Valid 16-byte key received');
        } else {
          const keyText = new TextDecoder().decode(keyData);
          console.log('   ❌ Invalid key:', keyText.substring(0, 200));
        }
      } else {
        console.log('   No key URL found in M3U8');
      }
      
      // Extract segment URL
      const lines = text.split('\n');
      const segmentLine = lines.find(l => l.includes('/dlhd/segment?'));
      if (segmentLine) {
        console.log('\n4. Fetching first segment...');
        console.log('   Segment URL:', segmentLine.substring(0, 100) + '...');
        
        const segRes = await fetch(segmentLine.trim());
        const segData = await segRes.arrayBuffer();
        console.log('   Status:', segRes.status);
        console.log('   Size:', segData.byteLength, 'bytes');
        console.log('   Content-Type:', segRes.headers.get('content-type'));
        
        if (segData.byteLength > 1000) {
          console.log('   ✅ Valid segment received');
        } else {
          const segText = new TextDecoder().decode(segData);
          console.log('   ❌ Invalid segment:', segText.substring(0, 200));
        }
      }
    } else {
      console.log('   ❌ Invalid response:', text.substring(0, 500));
    }
  } catch (e) {
    console.log('   ERROR:', e.message);
    console.log('   Stack:', e.stack);
  }
}

test();
