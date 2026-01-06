/**
 * Test the new VIPRow extraction logic
 */
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
      let data = Buffer.alloc(0);
      res.on('data', chunk => data = Buffer.concat([data, chunk]));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function testExtraction() {
  const eventUrl = '/nba/houston-rockets-vs-phoenix-suns-online-stream';
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  
  console.log('=== Step 1: Fetch VIPRow stream page ===');
  const streamRes = await fetch(streamPageUrl, { 'Referer': VIPROW_BASE });
  const streamHtml = streamRes.data.toString('utf8');
  console.log('Status:', streamRes.status, 'Length:', streamHtml.length);
  
  // Extract embed params
  const zmid = streamHtml.match(/const\s+zmid\s*=\s*["']([^"']+)["']/)?.[1];
  const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
  const edm = streamHtml.match(/const\s+edm\s*=\s*["']([^"']+)["']/)?.[1];
  const csrf = streamHtml.match(/"csrf"\s*:\s*"([^"]+)"/)?.[1] || '';
  const csrf_ip = streamHtml.match(/"csrf_ip"\s*:\s*"([^"]+)"/)?.[1] || '';
  const category = streamHtml.match(/"linkAppendUri"\s*:\s*"([^"]+)"/)?.[1] || '';
  
  console.log('Embed params:', { zmid, pid, edm, category });
  
  console.log('\n=== Step 2: Fetch Casthill embed ===');
  const embedParams = new URLSearchParams({ pid, gacat: '', gatxt: category, v: zmid, csrf, csrf_ip });
  const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams}`;
  
  const embedRes = await fetch(embedUrl, { 'Referer': streamPageUrl });
  const embedHtml = embedRes.data.toString('utf8');
  console.log('Status:', embedRes.status, 'Length:', embedHtml.length);
  
  // Find the big script
  const scripts = embedHtml.match(/<script>([\s\S]*?)<\/script>/g) || [];
  let bigScript = '';
  for (const s of scripts) {
    const content = s.replace(/<\/?script>/g, '');
    if (content.length > 100000) {
      bigScript = content;
      break;
    }
  }
  
  console.log('Big script length:', bigScript.length);
  
  console.log('\n=== Looking for base64 encoded URLs ===');
  
  // Find all base64-like strings
  const b64Matches = bigScript.match(/["']([A-Za-z0-9+/=]{40,})["']/g) || [];
  console.log('Found', b64Matches.length, 'base64-like strings');
  
  let foundUrls = [];
  for (const b64 of b64Matches) {
    const clean = b64.replace(/["']/g, '');
    try {
      const decoded = Buffer.from(clean, 'base64').toString('utf8');
      // Check if it looks like a URL or contains interesting keywords
      if (decoded.includes('http') || decoded.includes('boanki') || decoded.includes('peulleieo') || decoded.includes('.m3u8')) {
        console.log('Found URL:', decoded.substring(0, 100));
        foundUrls.push(decoded);
      }
    } catch {}
  }
  
  console.log('\n=== Looking for hex strings (device/stream IDs) ===');
  const hexMatches = bigScript.match(/["']([a-f0-9]{16,32})["']/g) || [];
  console.log('Found', hexMatches.length, 'hex strings');
  hexMatches.slice(0, 5).forEach(h => console.log('  ', h));
  
  console.log('\n=== Looking for double-encoded base64 ===');
  // Some values are base64(base64(value))
  for (const b64 of b64Matches.slice(0, 50)) {
    const clean = b64.replace(/["']/g, '');
    try {
      const decoded1 = Buffer.from(clean, 'base64').toString('utf8');
      // Check if decoded1 is also base64
      if (/^[A-Za-z0-9+/=]+$/.test(decoded1) && decoded1.length > 20) {
        try {
          const decoded2 = Buffer.from(decoded1, 'base64').toString('utf8');
          if (decoded2.includes('http') || decoded2.includes('boanki') || decoded2.includes('peulleieo')) {
            console.log('Double-decoded URL:', decoded2.substring(0, 100));
            foundUrls.push(decoded2);
          }
        } catch {}
      }
    } catch {}
  }
  
  console.log('\n=== Summary ===');
  console.log('Found URLs:', foundUrls.length);
  foundUrls.forEach(u => console.log('  ', u.substring(0, 80)));
}

testExtraction().catch(console.error);
