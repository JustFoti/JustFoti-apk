/**
 * Test if User-Agent is part of the hash validation
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getManifestWithUA(ua) {
  // Get embed with specific UA
  const scheduleRes = await fetch(`${VIPROW_BASE}/sports-big-games`, {
    headers: { 'User-Agent': ua }
  });
  const scheduleHtml = await scheduleRes.text();
  const eventMatch = scheduleHtml.match(/href="([^"]+online-stream)"[^>]*role="button"/);
  const eventUrl = eventMatch[1];
  
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  const streamRes = await fetch(streamPageUrl, {
    headers: { 'User-Agent': ua, 'Referer': VIPROW_BASE }
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
  
  // Fetch embed with same UA
  const embedRes = await fetch(embedUrl, {
    headers: { 'User-Agent': ua, 'Referer': streamPageUrl }
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
  console.log('=== Testing User-Agent hash binding ===\n');
  
  // Get manifest with our UA
  console.log('1. Getting manifest with standard UA...');
  const { manifestUrl, deviceId } = await getManifestWithUA(USER_AGENT);
  
  const url = new URL(manifestUrl);
  url.searchParams.set('u_id', deviceId);
  const urlStr = url.toString();
  
  console.log('   URL:', urlStr.substring(0, 100) + '...');
  
  // Test with same UA
  console.log('\n2. Fetching with SAME UA...');
  let res = await fetch(urlStr, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('   Status:', res.status);
  
  // Test with different UA
  console.log('\n3. Fetching with DIFFERENT UA...');
  res = await fetch(urlStr, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('   Status:', res.status);
  
  // Test with no UA
  console.log('\n4. Fetching with NO UA...');
  res = await fetch(urlStr, {
    headers: {
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('   Status:', res.status);
  
  // The hash might include: IP + UA + timestamp + streamId + secret
  // If UA is part of the hash, changing it should give 403 (invalid hash)
  // If UA is just a requirement, changing it should give 401 (unauthorized)
  
  console.log('\n\n=== Analysis ===');
  console.log('If different UA gives 403: UA is part of hash');
  console.log('If different UA gives 401: UA is just a requirement');
  console.log('If no UA gives 403: UA is required for hash validation');
}

main().catch(console.error);
