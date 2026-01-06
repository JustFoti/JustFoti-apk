/**
 * Test User-Agent requirement
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
  
  const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  
  const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
  
  return { manifestUrl, deviceId };
}

async function main() {
  console.log('Getting fresh manifest URL...\n');
  const { manifestUrl, deviceId } = await getFreshManifest();
  
  const url = new URL(manifestUrl);
  url.searchParams.set('u_id', deviceId);
  const urlStr = url.toString();
  
  console.log('URL:', urlStr);
  console.log('');
  
  // Test different User-Agent combinations
  const tests = [
    { name: 'No headers at all', headers: {} },
    { name: 'Only User-Agent', headers: { 'User-Agent': USER_AGENT } },
    { name: 'UA + Accept', headers: { 'User-Agent': USER_AGENT, 'Accept': '*/*' } },
    { name: 'UA + Referer', headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://casthill.net/' } },
    { name: 'UA + Origin', headers: { 'User-Agent': USER_AGENT, 'Origin': 'https://casthill.net' } },
    { name: 'UA + Referer + Origin', headers: { 
      'User-Agent': USER_AGENT, 
      'Referer': 'https://casthill.net/', 
      'Origin': 'https://casthill.net' 
    }},
    { name: 'Full browser headers', headers: {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    }},
    { name: 'Mobile UA', headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      'Accept': '*/*',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    }},
  ];
  
  for (const test of tests) {
    const res = await fetch(urlStr, { headers: test.headers });
    const status = res.status;
    
    let extra = '';
    if (status === 200) {
      const text = await res.text();
      extra = text.includes('#EXTM3U') ? ' ✓ M3U8!' : ' (not m3u8)';
    }
    
    console.log(`${test.name}: ${status}${extra}`);
  }
}

main().catch(console.error);
