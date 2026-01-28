const CF_URL = 'https://media-proxy.vynx.workers.dev';

async function test() {
  console.log('Testing channel 35 (Sky Sports Football)...');
  
  // Get M3U8
  const url = `${CF_URL}/tv/?channel=35`;
  console.log('1. Fetching M3U8...');
  
  const res = await fetch(url, { 
    signal: AbortSignal.timeout(15000),
    headers: { 
      'Origin': 'https://flyx.tv',
      'Referer': 'https://flyx.tv/',
    }
  });
  
  const text = await res.text();
  console.log('Full M3U8:');
  console.log(text);
  
  // Check for EXT-X-KEY
  const keyMatch = text.match(/#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/);
  if (keyMatch) {
    console.log('\nAES Key URL found:', keyMatch[1]);
  } else {
    console.log('\nNo AES key in this stream (unencrypted or different format)');
  }
}

test().catch(console.error);
