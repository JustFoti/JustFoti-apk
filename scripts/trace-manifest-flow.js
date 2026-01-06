/**
 * Trace the exact flow from embed load to manifest fetch
 */

const fs = require('fs');
const script = fs.readFileSync('scripts/casthill-script-2.js', 'utf8');

console.log('=== Tracing manifest fetch flow ===\n');

// The flow is:
// 1. Page loads
// 2. Check if hashExpiresAt is valid (from sessionStorage)
// 3. If valid, use cached scode and call k() directly
// 4. If not valid, call T() to refresh tokens, then k()

// Let's trace what T() does:
console.log('=== T() function - Token refresh ===');
console.log('1. Constructs URL: _ = C({scode, ts, device_id}, true)');
console.log('   URL format: https://boanki.net?scode=X&stream=X&expires=X&u_id=X&host_id=X&r=1');
console.log('2. Fetches with headers E (Accept: application/json, X-CSRF-Auth: ...)');
console.log('3. Uses credentials: "include"');
console.log('4. Response: {scode, ts, device_id}');
console.log('5. Stores in sessionStorage');
console.log('6. Calls k()');

console.log('\n=== k() function - Manifest fetch ===');
console.log('1. Constructs URL: new URL(u) where u is the manifest URL');
console.log('2. Adds u_id parameter: url.searchParams.set("u_id", I)');
console.log('3. Calls inner async function that:');
console.log('   a. Fetches manifest URL with A()');
console.log('   b. Extracts key URL from #EXT-X-KEY');
console.log('   c. Fetches key URL with A()');
console.log('   d. Returns finalURL');

console.log('\n=== A() function - Simple fetch ===');
console.log('fetch(e, {redirect:"follow", mode:"cors", cache:"no-store", signal:t.signal})');
console.log('NO custom headers!');

console.log('\n\n=== Key insight ===');
console.log('The manifest URL (u) is pre-generated with a hash.');
console.log('The hash is generated server-side when the embed page is created.');
console.log('The hash likely includes: streamId + timestamp + clientIP + secret');
console.log('');
console.log('When we fetch the embed, the server generates a hash for OUR IP.');
console.log('When we fetch the manifest, the server validates the hash against OUR IP.');
console.log('');
console.log('So the hash SHOULD be valid for our IP!');
console.log('');
console.log('The 401 might be because:');
console.log('1. The hash has expired (timestamp in URL)');
console.log('2. The server requires a specific header we are not sending');
console.log('3. The server requires a cookie we are not sending');
console.log('4. The server does additional validation');

// Let's check the timestamp more carefully
console.log('\n\n=== Checking timestamp validity ===');

// Extract timestamp from a fresh embed
const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function checkTimestamp() {
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
  
  const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  
  const url = new URL(manifestUrl);
  const pathParts = url.pathname.split('/');
  const urlTimestamp = parseInt(pathParts[3]);
  const now = Math.floor(Date.now() / 1000);
  
  console.log('Manifest URL:', manifestUrl);
  console.log('URL timestamp:', urlTimestamp, '(' + new Date(urlTimestamp * 1000).toISOString() + ')');
  console.log('Current time:', now, '(' + new Date(now * 1000).toISOString() + ')');
  console.log('Time until expiry:', urlTimestamp - now, 'seconds');
  
  // The timestamp is in the FUTURE - it's an expiry time
  // Let's try fetching immediately
  
  const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
  url.searchParams.set('u_id', deviceId);
  
  console.log('\nFetching manifest immediately...');
  const manifestRes = await fetch(url.toString(), {
    headers: {
      'Accept': '*/*',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  
  console.log('Status:', manifestRes.status);
  
  if (manifestRes.ok) {
    const content = await manifestRes.text();
    console.log('SUCCESS! Content:', content.substring(0, 500));
  } else {
    // Check all response headers
    console.log('\nResponse headers:');
    for (const [key, value] of manifestRes.headers.entries()) {
      console.log(' ', key + ':', value);
    }
  }
}

checkTimestamp().catch(console.error);
