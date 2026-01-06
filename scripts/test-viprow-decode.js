const https = require('https');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': USER_AGENT, ...headers }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function testVIPRow() {
  const eventUrl = '/nba/houston-rockets-vs-phoenix-suns-online-stream';
  const linkNum = '1';
  
  console.log('=== Step 1: Fetch VIPRow stream page ===');
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-${linkNum}`;
  
  const streamRes = await fetch(streamPageUrl, { 'Referer': VIPROW_BASE });
  
  // Extract embed params
  const zmid = streamRes.data.match(/const\s+zmid\s*=\s*["']([^"']+)["']/)?.[1];
  const pid = streamRes.data.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
  const edm = streamRes.data.match(/const\s+edm\s*=\s*["']([^"']+)["']/)?.[1];
  const csrf = streamRes.data.match(/"csrf"\s*:\s*"([^"]+)"/)?.[1] || '';
  const csrf_ip = streamRes.data.match(/"csrf_ip"\s*:\s*"([^"]+)"/)?.[1] || '';
  const category = streamRes.data.match(/"linkAppendUri"\s*:\s*"([^"]+)"/)?.[1] || '';
  
  console.log('Embed params:', { zmid, pid, edm, category });
  
  console.log('\n=== Step 2: Fetch Casthill embed ===');
  const embedParams = new URLSearchParams({
    pid, gacat: '', gatxt: category, v: zmid, csrf, csrf_ip,
  });
  const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams}`;
  
  const embedRes = await fetch(embedUrl, { 
    'Referer': streamPageUrl,
    'Origin': 'https://www.viprow.nu'
  });
  
  // Find the obfuscated script
  const obfMatch = embedRes.data.match(/window\['([^']+)'\]='([^']+)'/);
  if (obfMatch) {
    console.log('Found obfuscated script');
    console.log('Key:', obfMatch[1]);
    console.log('Value length:', obfMatch[2].length);
    
    // Try to decode - it might be base64 or custom encoding
    const encoded = obfMatch[2];
    
    // Try base64
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      console.log('\nBase64 decoded (first 500 chars):');
      console.log(decoded.substring(0, 500));
      
      // Check if it contains our markers
      if (decoded.includes('isPlayerLoaded') || decoded.includes('scode')) {
        console.log('\n✅ Found player markers in decoded script!');
      }
    } catch (e) {
      console.log('Base64 decode failed:', e.message);
    }
    
    // Try to find the decoding function
    const decoderMatch = embedRes.data.match(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*window\[/);
    if (decoderMatch) {
      console.log('\nFound decoder function:', decoderMatch[0].substring(0, 200));
    }
  }
  
  // Also check for direct script patterns
  const scripts = embedRes.data.match(/<script[^>]*>[\s\S]*?<\/script>/g) || [];
  console.log('\nFound', scripts.length, 'scripts');
  
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    if (script.includes('isPlayerLoaded') || script.includes('scode')) {
      console.log(`\n✅ Script ${i+1} contains player markers!`);
      console.log(script.substring(0, 500));
    }
  }
}

testVIPRow().catch(console.error);
