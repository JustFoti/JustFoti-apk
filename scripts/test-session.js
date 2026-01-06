/**
 * Test if a session needs to be established first
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('=== Testing session establishment ===\n');
  
  // Get fresh embed
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
  
  console.log('Fetching embed...');
  const embedRes = await fetch(embedUrl, {
    headers: { 'User-Agent': USER_AGENT, 'Referer': streamPageUrl }
  });
  
  // Get cookies from embed
  const embedCookies = embedRes.headers.get('set-cookie');
  console.log('Embed cookies:', embedCookies);
  
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
  
  const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
  const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  
  const url = new URL(manifestUrl);
  url.searchParams.set('u_id', deviceId);
  
  console.log('\nManifest URL:', url.toString());
  console.log('Manifest host:', url.hostname);
  
  // The manifest server is different from casthill.net
  // Maybe we need to establish a session with the manifest server first
  
  console.log('\n\n=== Testing manifest server session ===\n');
  
  // Test 1: Hit the manifest server root first
  console.log('1. Hitting manifest server root...');
  const rootRes = await fetch(`https://${url.hostname}/`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('   Status:', rootRes.status);
  console.log('   Cookies:', rootRes.headers.get('set-cookie'));
  
  // Test 2: Hit a path on the manifest server
  console.log('\n2. Hitting /pavel/ path...');
  const pavelRes = await fetch(`https://${url.hostname}/pavel/`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('   Status:', pavelRes.status);
  console.log('   Cookies:', pavelRes.headers.get('set-cookie'));
  
  // Test 3: Try the manifest with cookies from casthill
  console.log('\n3. Manifest with casthill cookies...');
  const cookieStr = embedCookies ? embedCookies.split(';')[0] : '';
  const manifestRes = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'Cookie': cookieStr,
    },
  });
  console.log('   Status:', manifestRes.status);
  
  // Test 4: Check if there's a preflight that sets cookies
  console.log('\n4. OPTIONS preflight...');
  const optionsRes = await fetch(url.toString(), {
    method: 'OPTIONS',
    headers: {
      'User-Agent': USER_AGENT,
      'Origin': 'https://casthill.net',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'range',
    },
  });
  console.log('   Status:', optionsRes.status);
  console.log('   Cookies:', optionsRes.headers.get('set-cookie'));
  
  // Test 5: Try with credentials mode
  console.log('\n5. With credentials mode (simulated)...');
  // Node fetch doesn't support credentials, but we can try sending cookies
  const manifestRes2 = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'Cookie': cookieStr,
    },
    credentials: 'include',
  });
  console.log('   Status:', manifestRes2.status);
  
  // Test 6: Check if the boanki.net token endpoint sets something
  console.log('\n\n=== Checking boanki.net ===\n');
  
  const scode = embedScript.match(/i=e\(\[([0-9,]+)\]\)/);
  const scodeVal = scode ? String.fromCharCode(...JSON.parse('[' + scode[1] + ']')) : null;
  const timestamp = embedScript.match(/a=parseInt\("(\d+)"/)?.[1];
  const streamId = embedScript.match(/s="([a-z0-9]{15,})"/)?.[1];
  const hostId = embedScript.match(/m="([a-z0-9-]+)"/)?.[1];
  const lMatch = embedScript.match(/l=t\("([A-Za-z0-9+/=]+)"\)/);
  const csrfAuth = lMatch ? Buffer.from(lMatch[1], 'base64').toString('utf8') : null;
  
  const tokenUrl = `https://boanki.net?scode=${encodeURIComponent(scodeVal)}&stream=${encodeURIComponent(streamId)}&expires=${encodeURIComponent(timestamp)}&u_id=${encodeURIComponent(deviceId)}&host_id=${encodeURIComponent(hostId)}`;
  
  console.log('Token URL:', tokenUrl);
  console.log('X-CSRF-Auth:', csrfAuth?.substring(0, 50) + '...');
  
  const tokenRes = await fetch(tokenUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'X-CSRF-Auth': csrfAuth,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  
  console.log('Token response status:', tokenRes.status);
  console.log('Token response cookies:', tokenRes.headers.get('set-cookie'));
  
  const tokenText = await tokenRes.text();
  console.log('Token response body:', tokenText.substring(0, 300));
}

main().catch(console.error);
