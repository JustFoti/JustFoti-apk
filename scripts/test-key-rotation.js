/**
 * Test if the key changes over time
 */

async function test() {
  const headers = { 
    'User-Agent': 'Mozilla/5.0', 
    'Referer': 'https://epicplayplay.cfd/', 
    'Origin': 'https://epicplayplay.cfd' 
  };
  
  console.log('Testing key rotation over 10 seconds...\n');
  
  const keys = [];
  
  for (let i = 0; i < 5; i++) {
    const res = await fetch('https://zekonew.giokko.ru/zeko/premium769/mono.css', { headers });
    const m3u8 = await res.text();
    const keyUrl = m3u8.match(/URI="([^"]+)"/)?.[1];
    const seq = m3u8.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)?.[1];
    const keyNum = keyUrl?.match(/number=(\d+)/)?.[1];
    
    // Fetch the actual key
    const keyRes = await fetch(keyUrl, { headers });
    const keyBuf = await keyRes.arrayBuffer();
    const keyHex = Buffer.from(keyBuf).toString('hex');
    
    console.log(`T+${i*2}s: seq=${seq}, keyNum=${keyNum}, key=${keyHex}`);
    keys.push({ seq, keyNum, keyHex });
    
    if (i < 4) await new Promise(r => setTimeout(r, 2000));
  }
  
  // Check if keys are the same
  const uniqueKeys = [...new Set(keys.map(k => k.keyHex))];
  console.log(`\nUnique keys: ${uniqueKeys.length}`);
  console.log(`Key changes: ${uniqueKeys.length > 1 ? 'YES - key rotates!' : 'NO - same key'}`);
}

test().catch(console.error);
