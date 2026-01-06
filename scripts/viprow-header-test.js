/**
 * Test different header combinations to find what's required
 */

const fs = require('fs');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getManifestUrl() {
  // Quick fetch to get a fresh manifest URL
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
  let script = null;
  let match;
  while ((match = scriptPattern.exec(embedHtml)) !== null) {
    if (match[1].includes('isPlayerLoaded') && match[1].includes('scode')) {
      script = match[1];
      break;
    }
  }
  
  const rMatch = script.match(/r="([a-z0-9]+)"/);
  const deviceId = rMatch?.[1];
  
  const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  
  return { manifestUrl, deviceId, embedUrl };
}

async function testHeaders(manifestUrl, deviceId) {
  const url = new URL(manifestUrl);
  url.searchParams.set('u_id', deviceId);
  const urlStr = url.toString();
  
  console.log('Testing URL:', urlStr);
  console.log('');
  
  // Test individual headers
  const baseHeaders = {
    'User-Agent': USER_AGENT,
  };
  
  const headerTests = [
    { name: 'User-Agent only', headers: { ...baseHeaders } },
    { name: '+ Accept', headers: { ...baseHeaders, 'Accept': '*/*' } },
    { name: '+ Referer casthill', headers: { ...baseHeaders, 'Accept': '*/*', 'Referer': 'https://casthill.net/' } },
    { name: '+ Origin casthill', headers: { ...baseHeaders, 'Accept': '*/*', 'Referer': 'https://casthill.net/', 'Origin': 'https://casthill.net' } },
    { name: 'Origin only (no Referer)', headers: { ...baseHeaders, 'Accept': '*/*', 'Origin': 'https://casthill.net' } },
    { name: 'Sec-Fetch headers', headers: { 
      ...baseHeaders, 
      'Accept': '*/*',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    }},
    { name: 'Full browser headers', headers: {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    }},
    { name: 'Range header (for HLS)', headers: {
      ...baseHeaders,
      'Accept': '*/*',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'Range': 'bytes=0-',
    }},
  ];
  
  for (const test of headerTests) {
    try {
      const res = await fetch(urlStr, {
        headers: test.headers,
        redirect: 'manual', // Don't follow redirects
      });
      
      const status = res.status;
      const location = res.headers.get('location');
      const contentType = res.headers.get('content-type');
      
      console.log(`${test.name}: ${status} ${location ? '-> ' + location : ''} (${contentType || 'no content-type'})`);
      
      if (status === 200 || status === 206) {
        const text = await res.text();
        console.log('  SUCCESS! Content:', text.substring(0, 200));
        return;
      }
      
      if (status === 302 || status === 301) {
        console.log('  Redirect to:', location);
        // Follow the redirect
        const redirectRes = await fetch(location, { headers: test.headers });
        console.log('  After redirect:', redirectRes.status);
        if (redirectRes.ok) {
          const text = await redirectRes.text();
          console.log('  Content:', text.substring(0, 200));
        }
      }
    } catch (e) {
      console.log(`${test.name}: ERROR - ${e.message}`);
    }
  }
}

async function main() {
  try {
    console.log('Fetching fresh manifest URL...\n');
    const { manifestUrl, deviceId, embedUrl } = await getManifestUrl();
    console.log('Manifest URL:', manifestUrl);
    console.log('Device ID:', deviceId);
    console.log('');
    
    await testHeaders(manifestUrl, deviceId);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
