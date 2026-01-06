/**
 * Look for stream data directly in VIPRow page
 * Maybe we can bypass Casthill entirely
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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function findStreamData() {
  const eventUrl = '/nba/houston-rockets-vs-phoenix-suns-online-stream';
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  
  console.log('Fetching:', streamPageUrl);
  const res = await fetch(streamPageUrl, { 'Referer': VIPROW_BASE });
  const html = res.data;
  
  console.log('Page length:', html.length);
  
  // Look for all JavaScript variables
  console.log('\n=== JavaScript variables ===');
  const constMatches = html.match(/const\s+\w+\s*=\s*[^;]+/g) || [];
  constMatches.forEach(m => console.log(m.substring(0, 100)));
  
  // Look for any URLs
  console.log('\n=== URLs in page ===');
  const urlMatches = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
  const uniqueUrls = [...new Set(urlMatches)];
  uniqueUrls.forEach(u => {
    if (u.includes('m3u8') || u.includes('stream') || u.includes('boanki') || u.includes('peulleieo') || u.includes('casthill')) {
      console.log(u);
    }
  });
  
  // Look for the zmid value - this is the stream identifier
  const zmid = html.match(/const\s+zmid\s*=\s*["']([^"']+)["']/)?.[1];
  console.log('\n=== Stream identifier ===');
  console.log('zmid:', zmid);
  
  // The zmid format is like "nba7hd~nba7sd" - these are stream names
  // Maybe we can construct the stream URL directly?
  if (zmid) {
    const streams = zmid.split('~');
    console.log('Stream names:', streams);
    
    // Try common stream URL patterns
    console.log('\n=== Trying direct stream URLs ===');
    for (const stream of streams) {
      // Common patterns for HLS streams
      const patterns = [
        `https://peulleieo.net/hls/${stream}/index.m3u8`,
        `https://peulleieo.net/live/${stream}/index.m3u8`,
        `https://peulleieo.net/${stream}/index.m3u8`,
        `https://boanki.net/hls/${stream}/index.m3u8`,
      ];
      
      for (const pattern of patterns) {
        console.log('Trying:', pattern);
        try {
          const testRes = await fetch(pattern, {
            'Origin': 'https://casthill.net',
            'Referer': 'https://casthill.net/',
          });
          console.log('  Status:', testRes.status, 'Length:', testRes.data.length);
          if (testRes.status === 200 && testRes.data.includes('#EXTM3U')) {
            console.log('  ✅ FOUND VALID M3U8!');
            console.log(testRes.data.substring(0, 500));
            return;
          }
        } catch (e) {
          console.log('  Error:', e.message);
        }
      }
    }
  }
  
  // Look for any data attributes that might contain stream info
  console.log('\n=== Data attributes ===');
  const dataAttrs = html.match(/data-[a-z-]+="[^"]+"/g) || [];
  dataAttrs.forEach(d => console.log(d));
}

findStreamData().catch(console.error);
