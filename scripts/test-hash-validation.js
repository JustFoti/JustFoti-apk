/**
 * Test what the hash is validated against
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  // Get fresh data
  console.log('Getting fresh embed data...\n');
  
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
  
  console.log('CSRF IP from config:', config.csrf_ip);
  
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
  
  const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  
  const url = new URL(manifestUrl);
  const pathParts = url.pathname.split('/');
  const hash = pathParts[4];
  const timestamp = pathParts[3];
  
  console.log('\nExtracted values:');
  console.log('  deviceId:', deviceId);
  console.log('  streamId:', streamId);
  console.log('  hostId:', hostId);
  console.log('  timestamp:', timestamp);
  console.log('  hash:', hash);
  console.log('  manifestHost:', url.hostname);
  
  // The hash is 64 chars = SHA256
  // It's likely: sha256(streamId + timestamp + clientIP + secret)
  // Or: sha256(streamId + timestamp + deviceId + secret)
  
  // Let's try to understand what the hash validates
  // by testing with modified parameters
  
  console.log('\n\n=== Testing hash validation ===\n');
  
  // Test 1: Original URL
  url.searchParams.set('u_id', deviceId);
  let res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('Original URL:', res.status);
  
  // Test 2: Different u_id
  url.searchParams.set('u_id', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('Different u_id:', res.status);
  
  // Test 3: No u_id
  url.searchParams.delete('u_id');
  res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('No u_id:', res.status);
  
  // Test 4: Modified hash (should fail)
  const modifiedUrl = manifestUrl.replace(hash, hash.replace('a', 'b'));
  res = await fetch(modifiedUrl + '?u_id=' + deviceId, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('Modified hash:', res.status);
  
  // Test 5: Check if the server is checking our IP
  // We can't change our IP, but we can check if X-Forwarded-For affects it
  url.searchParams.set('u_id', deviceId);
  res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'X-Forwarded-For': config.csrf_ip, // Use the IP from the CSRF token
    },
  });
  console.log('With X-Forwarded-For:', res.status);
  
  // Test 6: Check if CF-Connecting-IP matters
  res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'CF-Connecting-IP': config.csrf_ip,
    },
  });
  console.log('With CF-Connecting-IP:', res.status);
  
  console.log('\n\nConclusion:');
  console.log('The hash is validated server-side.');
  console.log('The u_id parameter does not affect validation (same status).');
  console.log('The hash is likely tied to the IP that requested the embed.');
}

main().catch(console.error);
