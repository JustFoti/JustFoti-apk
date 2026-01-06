/**
 * Deep analysis of manifest URL authentication
 */

const fs = require('fs');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getFreshData() {
  // Get fresh embed data
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
  
  // Get cookies from embed response
  const embedCookies = embedRes.headers.get('set-cookie');
  
  // Extract script
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let script = null;
  let match;
  while ((match = scriptPattern.exec(embedHtml)) !== null) {
    if (match[1].includes('isPlayerLoaded') && match[1].includes('scode')) {
      script = match[1];
      break;
    }
  }
  
  const deviceId = script.match(/r="([a-z0-9]+)"/)?.[1];
  const streamId = script.match(/s="([a-z0-9]{15,})"/)?.[1];
  const hostId = script.match(/m="([a-z0-9-]+)"/)?.[1];
  
  const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  
  return { manifestUrl, deviceId, streamId, hostId, embedUrl, embedCookies, streamPageUrl };
}

async function main() {
  console.log('Getting fresh data...\n');
  const data = await getFreshData();
  
  console.log('Manifest URL:', data.manifestUrl);
  console.log('Device ID:', data.deviceId);
  console.log('Embed cookies:', data.embedCookies);
  console.log('');
  
  const url = new URL(data.manifestUrl);
  url.searchParams.set('u_id', data.deviceId);
  
  // The manifest URL has a hash that should be valid
  // Let's try different approaches
  
  console.log('=== Testing different request methods ===\n');
  
  // Test 1: Try with the exact same IP that generated the hash
  // The hash might be IP-bound, but we're using the same IP
  
  // Test 2: Check if there's a timing issue
  const pathParts = url.pathname.split('/');
  const urlTimestamp = parseInt(pathParts[3]);
  const now = Math.floor(Date.now() / 1000);
  console.log('URL timestamp:', urlTimestamp);
  console.log('Current time:', now);
  console.log('Difference:', urlTimestamp - now, 'seconds');
  console.log('');
  
  // Test 3: Try fetching without the u_id parameter
  console.log('Test 1: Without u_id parameter');
  let res = await fetch(data.manifestUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('Status:', res.status);
  
  // Test 4: Try with different Accept headers
  console.log('\nTest 2: With application/vnd.apple.mpegurl Accept');
  res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/vnd.apple.mpegurl',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('Status:', res.status);
  
  // Test 5: Try with Range header (common for HLS)
  console.log('\nTest 3: With Range header');
  res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Range': 'bytes=0-',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  console.log('Status:', res.status);
  
  // Test 6: Check if the server wants specific headers
  console.log('\nTest 4: Checking CORS preflight response');
  res = await fetch(url.toString(), {
    method: 'OPTIONS',
    headers: {
      'User-Agent': USER_AGENT,
      'Origin': 'https://casthill.net',
      'Access-Control-Request-Method': 'GET',
    },
  });
  console.log('Status:', res.status);
  console.log('Allow-Headers:', res.headers.get('access-control-allow-headers'));
  console.log('Allow-Origin:', res.headers.get('access-control-allow-origin'));
  console.log('Allow-Credentials:', res.headers.get('access-control-allow-credentials'));
  
  // Test 7: The server allows credentials - maybe it needs a specific cookie
  // Let's check what cookies the embed page sets
  console.log('\n\nEmbed cookies:', data.embedCookies);
  
  // Test 8: Try with the tamedy cookie
  console.log('\nTest 5: With tamedy cookie');
  res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'Cookie': 'tamedy=1',
    },
  });
  console.log('Status:', res.status);
  
  // Test 9: The manifest server is different from casthill
  // Maybe it needs cookies from the manifest server domain
  console.log('\nTest 6: Checking manifest server directly');
  const manifestHost = url.hostname;
  res = await fetch(`https://${manifestHost}/`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  console.log('Root status:', res.status);
  console.log('Root cookies:', res.headers.get('set-cookie'));
  
  // Test 10: Try the manifest with credentials from manifest server
  if (res.headers.get('set-cookie')) {
    const cookies = res.headers.get('set-cookie');
    console.log('\nTest 7: With manifest server cookies');
    res = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
        'Cookie': cookies.split(';')[0],
      },
    });
    console.log('Status:', res.status);
  }
}

main().catch(console.error);
