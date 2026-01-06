/**
 * Test fetching manifest directly like k() does
 * 
 * k() does:
 * 1. const t = new URL(u)
 * 2. t.searchParams.set("u_id", I)
 * 3. await A(t.toString())
 * 
 * A() does:
 * fetch(e, {redirect:"follow", mode:"cors", cache:"no-store", signal:t.signal})
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('=== Testing direct manifest fetch like k() ===\n');
  
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
  
  // Extract u (manifest URL) and I (device_id)
  const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
  const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  
  console.log('Manifest URL (u):', manifestUrl);
  console.log('Device ID (I):', deviceId);
  
  // Construct URL like k() does
  const url = new URL(manifestUrl);
  url.searchParams.set('u_id', deviceId);
  
  console.log('\nFinal URL:', url.toString());
  
  // Fetch like A() does - NO custom headers!
  // A() uses: fetch(e, {redirect:"follow", mode:"cors", cache:"no-store"})
  console.log('\n1. Fetching like A() - no custom headers...');
  let res = await fetch(url.toString(), {
    redirect: 'follow',
    mode: 'cors',
    cache: 'no-store',
  });
  console.log('   Status:', res.status);
  
  // But wait - in a browser, CORS requests automatically include Origin
  // And the browser might add Referer based on the page context
  
  console.log('\n2. Fetching with browser-like CORS headers...');
  res = await fetch(url.toString(), {
    redirect: 'follow',
    mode: 'cors',
    cache: 'no-store',
    headers: {
      'Origin': 'https://casthill.net',
      // Referer is set by browser based on referrer policy
      // casthill.net has: <meta content="no-referrer-when-downgrade" name="referrer">
      // This means Referer is sent for same-protocol requests
      'Referer': 'https://casthill.net/',
    },
  });
  console.log('   Status:', res.status);
  
  // The browser also sends User-Agent automatically
  console.log('\n3. With User-Agent...');
  res = await fetch(url.toString(), {
    redirect: 'follow',
    mode: 'cors',
    cache: 'no-store',
    headers: {
      'User-Agent': USER_AGENT,
      'Origin': 'https://casthill.net',
      'Referer': 'https://casthill.net/',
    },
  });
  console.log('   Status:', res.status);
  
  if (res.ok) {
    const text = await res.text();
    console.log('\n=== SUCCESS ===');
    console.log(text.substring(0, 1000));
  } else {
    // Check what the browser actually sends
    console.log('\n\n=== Browser Request Analysis ===');
    console.log('In a browser, fetch() with mode:"cors" sends:');
    console.log('- Origin: (automatically set to page origin)');
    console.log('- Referer: (based on referrer policy)');
    console.log('- User-Agent: (browser UA)');
    console.log('- Accept: */*');
    console.log('- Accept-Language: (browser setting)');
    console.log('- Accept-Encoding: gzip, deflate, br');
    console.log('- Connection: keep-alive');
    console.log('- Sec-Fetch-Dest: empty');
    console.log('- Sec-Fetch-Mode: cors');
    console.log('- Sec-Fetch-Site: cross-site');
    console.log('');
    console.log('The server returns 401 even with all these headers.');
    console.log('This suggests the auth is NOT in the headers.');
    console.log('');
    console.log('Possible explanations:');
    console.log('1. The hash is tied to a browser fingerprint');
    console.log('2. There is a timing/sequence requirement');
    console.log('3. The server checks TLS fingerprint');
    console.log('4. There is a hidden cookie or storage mechanism');
  }
}

main().catch(console.error);
