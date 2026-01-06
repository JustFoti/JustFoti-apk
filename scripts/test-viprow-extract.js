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
  console.log('URL:', streamPageUrl);
  
  const streamRes = await fetch(streamPageUrl, { 'Referer': VIPROW_BASE });
  console.log('Status:', streamRes.status);
  console.log('Length:', streamRes.data.length);
  
  // Extract embed params
  const zmidMatch = streamRes.data.match(/const\s+zmid\s*=\s*["']([^"']+)["']/);
  const pidMatch = streamRes.data.match(/const\s+pid\s*=\s*(\d+)/);
  const edmMatch = streamRes.data.match(/const\s+edm\s*=\s*["']([^"']+)["']/);
  
  console.log('\nEmbed params:');
  console.log('  zmid:', zmidMatch ? zmidMatch[1] : 'NOT FOUND');
  console.log('  pid:', pidMatch ? pidMatch[1] : 'NOT FOUND');
  console.log('  edm:', edmMatch ? edmMatch[1] : 'NOT FOUND');
  
  if (!zmidMatch || !pidMatch || !edmMatch) {
    console.log('\n❌ Missing embed params - checking page content...');
    console.log('First 2000 chars:', streamRes.data.substring(0, 2000));
    return;
  }
  
  const zmid = zmidMatch[1];
  const pid = pidMatch[1];
  const edm = edmMatch[1];
  
  // Extract CSRF tokens
  const csrfMatch = streamRes.data.match(/"csrf"\s*:\s*"([^"]+)"/);
  const csrfIpMatch = streamRes.data.match(/"csrf_ip"\s*:\s*"([^"]+)"/);
  const categoryMatch = streamRes.data.match(/"linkAppendUri"\s*:\s*"([^"]+)"/);
  
  const csrf = csrfMatch ? csrfMatch[1] : '';
  const csrf_ip = csrfIpMatch ? csrfIpMatch[1] : '';
  const category = categoryMatch ? categoryMatch[1] : '';
  
  console.log('  csrf:', csrf || 'NOT FOUND');
  console.log('  category:', category || 'NOT FOUND');
  
  console.log('\n=== Step 2: Fetch Casthill embed ===');
  const embedParams = new URLSearchParams({
    pid: pid,
    gacat: '',
    gatxt: category,
    v: zmid,
    csrf: csrf,
    csrf_ip: csrf_ip,
  });
  const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams}`;
  console.log('URL:', embedUrl.substring(0, 100) + '...');
  
  const embedRes = await fetch(embedUrl, { 
    'Referer': streamPageUrl,
    'Origin': 'https://www.viprow.nu'
  });
  console.log('Status:', embedRes.status);
  console.log('Length:', embedRes.data.length);
  
  // Find player script
  const scriptMatch = embedRes.data.match(/<script[^>]*>\s*(var\s+\w+\s*=\s*\[.*?)\s*<\/script>/s);
  if (!scriptMatch) {
    console.log('\n❌ Player script not found');
    console.log('Looking for scripts...');
    const scripts = embedRes.data.match(/<script[^>]*>[\s\S]*?<\/script>/g) || [];
    console.log('Found', scripts.length, 'script tags');
    scripts.forEach((s, i) => {
      console.log(`\nScript ${i + 1} (${s.length} chars):`);
      console.log(s.substring(0, 300));
    });
    return;
  }
  
  console.log('\n✅ Found player script:', scriptMatch[1].substring(0, 200) + '...');
}

testVIPRow().catch(console.error);
