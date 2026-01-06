/**
 * Analyze boanki.net authentication requirements
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('=== Analyzing boanki.net auth ===\n');
  
  // First, let's check what boanki.net returns without any auth
  console.log('1. Direct request to boanki.net root...');
  let res = await fetch('https://boanki.net/', {
    headers: { 'User-Agent': USER_AGENT },
  });
  console.log('   Status:', res.status);
  console.log('   Cookies:', res.headers.get('set-cookie'));
  
  // Check if it's a Cloudflare challenge
  const text = await res.text();
  if (text.includes('challenge-platform')) {
    console.log('   Cloudflare challenge detected');
  }
  
  // Get fresh embed data
  console.log('\n2. Getting fresh embed data...');
  const scheduleRes = await fetch(`${VIPROW_BASE}/sports-big-games`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  const scheduleHtml = await scheduleRes.text();
  const eventMatch = scheduleHtml.match(/href="([^"]+online-stream)"[^>]*role="button"/);
  const eventUrl = eventMatch[1];
  
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  const streamRes = await fetch(streamPageUrl, {
    headers: { 'User-Agent': USER_AGENT, 'Referer': VIPROW_BASE }
  });
  const streamHtml = await streamRes.text();
  
  const zmid = streamHtml.match(/const\s+zmid\s*=\s*"([^"]+)"/)?.[1];
  const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
  const edm = streamHtml.match(/const\s+edm\s*=\s*"([^"]+)"/)?.[1];
  const config = JSON.parse(streamHtml.match(/const siteConfig = (\{[^;]+\});/)?.[1] || '{}');
  
  const embedParams = new URLSearchParams({
    pid, gacat: '', gatxt: config.linkAppendUri, v: zmid,
    csrf: config.csrf, csrf_ip: config.csrf_ip,
  });
  const embedUrl = `https://${edm}/sd0embed/${config.linkAppendUri}?${embedParams}`;
  
  const embedRes = await fetch(embedUrl, {
    headers: { 'User-Agent': USER_AGENT, 'Referer': streamPageUrl }
  });
  const embedHtml = await embedRes.text();
  
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let embedScript = null;
  let match;
  while ((match = scriptPattern.exec(embedHtml)) !== null) {
    if (match[1].includes('isPlayerLoaded') && match[1].includes('scode')) {
      embedScript = match[1];
      break;
    }
  }
  
  // Extract all values
  const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
  const streamId = embedScript.match(/s="([a-z0-9]{15,})"/)?.[1];
  const hostId = embedScript.match(/m="([a-z0-9-]+)"/)?.[1];
  const scode = embedScript.match(/i=e\(\[([0-9,]+)\]\)/);
  const scodeVal = scode ? String.fromCharCode(...JSON.parse('[' + scode[1] + ']')) : null;
  const timestamp = embedScript.match(/a=parseInt\("(\d+)"/)?.[1];
  const lMatch = embedScript.match(/l=t\("([A-Za-z0-9+/=]+)"\)/);
  const csrfAuth = lMatch ? Buffer.from(lMatch[1], 'base64').toString('utf8') : null;
  const cMatch = embedScript.match(/c=t\("([A-Za-z0-9+/=]+)"\)/);
  const baseUrl = cMatch ? Buffer.from(cMatch[1], 'base64').toString('utf8') : null;
  
  console.log('   scode:', scodeVal);
  console.log('   timestamp:', timestamp);
  console.log('   deviceId:', deviceId);
  console.log('   hostId:', hostId);
  console.log('   csrfAuth:', csrfAuth?.substring(0, 50) + '...');
  
  // Construct the token URL
  const tokenUrl = `${baseUrl}?scode=${encodeURIComponent(scodeVal)}&stream=${encodeURIComponent(streamId)}&expires=${encodeURIComponent(timestamp)}&u_id=${encodeURIComponent(deviceId)}&host_id=${encodeURIComponent(hostId)}`;
  
  console.log('\n3. Token URL:', tokenUrl);
  
  // Try different approaches to boanki.net
  console.log('\n4. Testing boanki.net with different headers...');
  
  const tests = [
    {
      name: 'Basic',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'X-CSRF-Auth': csrfAuth,
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
      },
    },
    {
      name: 'With Sec-Fetch headers',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'X-CSRF-Auth': csrfAuth,
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      },
    },
    {
      name: 'With tamedy cookie',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'X-CSRF-Auth': csrfAuth,
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
        'Cookie': 'tamedy=1',
      },
    },
  ];
  
  for (const test of tests) {
    res = await fetch(tokenUrl, { headers: test.headers });
    console.log(`   ${test.name}: ${res.status}`);
    
    if (res.ok) {
      const json = await res.json();
      console.log('   Response:', JSON.stringify(json));
    }
  }
  
  // The key insight: boanki.net is behind Cloudflare
  // The 400 error is from Cloudflare, not the actual server
  // We need to bypass Cloudflare to get to the actual token endpoint
  
  console.log('\n\n=== Key Insight ===');
  console.log('boanki.net is protected by Cloudflare.');
  console.log('The 400 error is a Cloudflare challenge, not a server error.');
  console.log('');
  console.log('In the browser:');
  console.log('1. User visits casthill.net embed');
  console.log('2. Browser loads JavaScript');
  console.log('3. JavaScript calls boanki.net with credentials');
  console.log('4. Cloudflare sees it as a legitimate browser request');
  console.log('5. Token is returned');
  console.log('6. Manifest is fetched with the token');
  console.log('');
  console.log('The manifest URL already has a valid hash.');
  console.log('The 401 on manifest might mean:');
  console.log('- The token from boanki.net is required');
  console.log('- Or there is server-side session validation');
}

main().catch(console.error);
