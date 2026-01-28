const CF_URL = 'https://media-proxy.vynx.workers.dev';

async function test() {
  console.log('Testing channel 425 key fetch...');
  
  // First get the M3U8 to get the key URL
  const m3u8Url = `${CF_URL}/tv/?channel=425`;
  console.log('1. Fetching M3U8...');
  
  let keyUrl;
  try {
    const res = await fetch(m3u8Url, { 
      signal: AbortSignal.timeout(20000),
      headers: { 
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/',
      }
    });
    const text = await res.text();
    
    const keyMatch = text.match(/URI="([^"]+)"/);
    if (keyMatch) {
      keyUrl = keyMatch[1];
      console.log('   Key URL:', keyUrl.substring(0, 80) + '...');
    } else {
      console.log('   No key URL found in M3U8');
      return;
    }
  } catch (e) {
    console.log('   Error:', e.message);
    return;
  }
  
  // Now fetch the key
  console.log('\n2. Fetching key...');
  const start = Date.now();
  try {
    const res = await fetch(keyUrl, { 
      signal: AbortSignal.timeout(20000),
      headers: { 
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/',
      }
    });
    const elapsed = Date.now() - start;
    console.log(`   Status: ${res.status} (${elapsed}ms)`);
    console.log('   Content-Type:', res.headers.get('content-type'));
    console.log('   X-Fetched-Via:', res.headers.get('x-fetched-via'));
    
    const data = await res.arrayBuffer();
    console.log('   Data size:', data.byteLength, 'bytes');
    
    if (data.byteLength === 16) {
      console.log('   ✅ Valid 16-byte AES key!');
      console.log('   Key hex:', Buffer.from(data).toString('hex'));
    } else {
      const text = new TextDecoder().decode(data);
      console.log('   Response:', text.substring(0, 300));
    }
  } catch (e) {
    console.log('   Error:', e.message);
  }
}

test();
