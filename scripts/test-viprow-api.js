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

async function testVIPRowAPI() {
  const eventUrl = '/nba/houston-rockets-vs-phoenix-suns-online-stream';
  const linkNum = '1';
  
  console.log('=== Testing VIPRow API (embed mode) ===\n');
  
  // Step 1: Fetch VIPRow stream page
  const streamUrl = `${VIPROW_BASE}${eventUrl}-${linkNum}`;
  console.log('Fetching:', streamUrl);
  
  const streamRes = await fetch(streamUrl, { 'Referer': VIPROW_BASE });
  console.log('Status:', streamRes.status);
  
  // Extract embed params
  const zmidMatch = streamRes.data.match(/const\s+zmid\s*=\s*["']([^"']+)["']/);
  const pidMatch = streamRes.data.match(/const\s+pid\s*=\s*(\d+)/);
  const edmMatch = streamRes.data.match(/const\s+edm\s*=\s*["']([^"']+)["']/);
  
  if (!zmidMatch || !pidMatch || !edmMatch) {
    console.log('❌ Missing embed params');
    return;
  }
  
  const zmid = zmidMatch[1];
  const pid = pidMatch[1];
  const edm = edmMatch[1];
  
  // Extract CSRF tokens
  const csrf = streamRes.data.match(/"csrf"\s*:\s*"([^"]+)"/)?.[1] || '';
  const csrf_ip = streamRes.data.match(/"csrf_ip"\s*:\s*"([^"]+)"/)?.[1] || '';
  const category = streamRes.data.match(/"linkAppendUri"\s*:\s*"([^"]+)"/)?.[1] || '';
  
  console.log('\nEmbed params:');
  console.log('  zmid:', zmid);
  console.log('  pid:', pid);
  console.log('  edm:', edm);
  console.log('  category:', category);
  
  // Build embed URL
  const embedParams = new URLSearchParams({
    pid: pid,
    gacat: '',
    gatxt: category,
    v: zmid,
    csrf: csrf,
    csrf_ip: csrf_ip,
  });
  const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams}`;
  
  console.log('\n✅ Embed URL:');
  console.log(embedUrl);
  
  console.log('\n=== API Response (what frontend will get) ===');
  console.log(JSON.stringify({
    success: true,
    mode: 'embed',
    playerUrl: embedUrl,
    selectedLink: parseInt(linkNum),
    headers: { 'Referer': streamUrl },
  }, null, 2));
}

testVIPRowAPI().catch(console.error);
