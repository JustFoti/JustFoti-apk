const CF_URL = 'https://media-proxy.vynx.workers.dev';

async function test() {
  console.log('Testing channel 425 (beIN Sports USA)...');
  
  // Use the correct path format with /tv/ prefix
  const url = `${CF_URL}/tv/?channel=425`;
  console.log('URL:', url);
  
  const start = Date.now();
  try {
    const res = await fetch(url, { 
      signal: AbortSignal.timeout(25000),
      headers: { 
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/',
      }
    });
    const elapsed = Date.now() - start;
    console.log(`Status: ${res.status} (${elapsed}ms)`);
    console.log('Content-Type:', res.headers.get('content-type'));
    
    const text = await res.text();
    console.log('Response length:', text.length);
    
    if (text.startsWith('#EXTM3U')) {
      console.log('✅ Got M3U8 playlist!');
      console.log('First 400 chars:', text.substring(0, 400));
      
      // Check if there's a key URL
      const keyMatch = text.match(/URI="([^"]+)"/);
      if (keyMatch) {
        console.log('\nKey URL found:', keyMatch[1].substring(0, 100));
      }
    } else if (text.startsWith('{')) {
      console.log('Got JSON response:');
      try {
        const json = JSON.parse(text);
        console.log(JSON.stringify(json, null, 2).substring(0, 500));
      } catch {
        console.log(text.substring(0, 500));
      }
    } else {
      console.log('Response preview:', text.substring(0, 300));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

test();
