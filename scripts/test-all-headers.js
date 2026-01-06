/**
 * Test every possible header combination
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getFreshManifest() {
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
  
  const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
  const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  
  return { manifestUrl, deviceId };
}

async function main() {
  console.log('Getting fresh manifest...\n');
  const { manifestUrl, deviceId } = await getFreshManifest();
  
  const url = new URL(manifestUrl);
  url.searchParams.set('u_id', deviceId);
  const urlStr = url.toString();
  
  console.log('URL:', urlStr);
  console.log('');
  
  // The browser sends these headers for a CORS fetch:
  // - Accept
  // - Accept-Encoding
  // - Accept-Language
  // - Connection
  // - Host
  // - Origin
  // - Referer
  // - Sec-Ch-Ua
  // - Sec-Ch-Ua-Mobile
  // - Sec-Ch-Ua-Platform
  // - Sec-Fetch-Dest
  // - Sec-Fetch-Mode
  // - Sec-Fetch-Site
  // - User-Agent
  
  // Let's try the exact browser headers
  console.log('Testing with exact browser headers...');
  
  let res = await fetch(urlStr, {
    headers: {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Host': url.hostname,
      'Origin': 'https://casthill.net',
      'Referer': 'https://casthill.net/',
      'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'User-Agent': USER_AGENT,
    },
  });
  
  console.log('Status:', res.status);
  
  if (res.ok) {
    const text = await res.text();
    console.log('SUCCESS! Content:', text.substring(0, 500));
    return;
  }
  
  // Try without Sec-* headers
  console.log('\nWithout Sec-* headers...');
  res = await fetch(urlStr, {
    headers: {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://casthill.net',
      'Referer': 'https://casthill.net/',
      'User-Agent': USER_AGENT,
    },
  });
  console.log('Status:', res.status);
  
  // Try with just the minimum
  console.log('\nMinimum headers (Referer + Origin)...');
  res = await fetch(urlStr, {
    headers: {
      'Origin': 'https://casthill.net',
      'Referer': 'https://casthill.net/',
    },
  });
  console.log('Status:', res.status);
  
  // The CORS headers say Allow-Headers: Range
  // Maybe we need to send a Range header?
  console.log('\nWith Range header...');
  res = await fetch(urlStr, {
    headers: {
      'Accept': '*/*',
      'Origin': 'https://casthill.net',
      'Referer': 'https://casthill.net/',
      'Range': 'bytes=0-',
      'User-Agent': USER_AGENT,
    },
  });
  console.log('Status:', res.status);
  
  // Check if the response gives any hints
  console.log('\nResponse headers:');
  for (const [key, value] of res.headers.entries()) {
    console.log(' ', key + ':', value);
  }
  
  const body = await res.text();
  console.log('\nResponse body:');
  console.log(body);
}

main().catch(console.error);
