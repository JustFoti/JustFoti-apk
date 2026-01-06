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
  
  const embedParams = new URLSearchParams({
    pid, gacat: '', gatxt: category, v: zmid, csrf, csrf_ip,
  });
  const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams}`;
  
  const embedRes = await fetch(embedUrl, { 
    'Referer': streamPageUrl,
    'Origin': 'https://www.viprow.nu'
  });
  
  console.log('\n=== Looking for patterns in embed page ===');
  
  // Look for any URLs
  const urls = embedRes.data.match(/https?:\/\/[^\s"'<>]+/g) || [];
  console.log('Found URLs:', urls.length);
  urls.forEach(u => {
    if (u.includes('m3u8') || u.includes('boanki') || u.includes('peulleieo')) {
      console.log('  Interesting:', u);
    }
  });
  
  // Look for base64 encoded strings that might be URLs
  const b64Matches = embedRes.data.match(/[A-Za-z0-9+/=]{50,}/g) || [];
  console.log('\nBase64-like strings:', b64Matches.length);
  b64Matches.slice(0, 5).forEach(b => {
    try {
      const decoded = Buffer.from(b, 'base64').toString('utf8');
      if (decoded.includes('http') || decoded.includes('m3u8')) {
        console.log('  Decoded URL:', decoded.substring(0, 100));
      }
    } catch {}
  });
  
  // Look for the obfuscated script and try to find patterns
  const obfMatch = embedRes.data.match(/window\['([^']+)'\]='([^']+)'/);
  if (obfMatch) {
    const encoded = obfMatch[2];
    console.log('\nObfuscated script length:', encoded.length);
    
    // The decoder might use XOR or character shifting
    // Let's look for the decoder function
    const fullScript = embedRes.data.match(/<script>([\s\S]*?window\['[^']+'\][\s\S]*?)<\/script>/)?.[1];
    if (fullScript) {
      console.log('\nFull script length:', fullScript.length);
      
      // Look for the decoding logic
      const evalMatch = fullScript.match(/eval\s*\(/);
      const functionMatch = fullScript.match(/Function\s*\(/);
      console.log('Has eval:', !!evalMatch);
      console.log('Has Function:', !!functionMatch);
      
      // Look for character code operations
      const charCodeMatch = fullScript.match(/charCodeAt|fromCharCode/g);
      console.log('CharCode operations:', charCodeMatch?.length || 0);
    }
  }
  
  // Check if there's a direct API endpoint we can use
  console.log('\n=== Checking for API patterns ===');
  const apiPatterns = embedRes.data.match(/\/api\/|\/stream\/|\/play\//g);
  console.log('API patterns:', apiPatterns);
  
  // Look for stream IDs
  const streamIds = embedRes.data.match(/stream[_-]?id["']?\s*[:=]\s*["']?([a-z0-9]+)/gi);
  console.log('Stream IDs:', streamIds);
}

testVIPRow().catch(console.error);
