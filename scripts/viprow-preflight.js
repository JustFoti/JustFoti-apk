/**
 * Test if preflight OPTIONS request is needed
 */

const fs = require('fs');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getManifestUrl() {
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
  
  return { manifestUrl, deviceId };
}

async function main() {
  try {
    console.log('Fetching fresh manifest URL...\n');
    const { manifestUrl, deviceId } = await getManifestUrl();
    
    const url = new URL(manifestUrl);
    url.searchParams.set('u_id', deviceId);
    const urlStr = url.toString();
    
    console.log('URL:', urlStr);
    console.log('');
    
    // Test OPTIONS preflight
    console.log('1. Testing OPTIONS preflight...');
    const optionsRes = await fetch(urlStr, {
      method: 'OPTIONS',
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': 'https://casthill.net',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'range',
      },
    });
    
    console.log('   Status:', optionsRes.status);
    console.log('   CORS headers:');
    for (const [key, value] of optionsRes.headers.entries()) {
      if (key.toLowerCase().includes('access-control') || key.toLowerCase().includes('allow')) {
        console.log('     ', key + ':', value);
      }
    }
    
    // Test HEAD request
    console.log('\n2. Testing HEAD request...');
    const headRes = await fetch(urlStr, {
      method: 'HEAD',
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
      },
    });
    
    console.log('   Status:', headRes.status);
    console.log('   Headers:');
    for (const [key, value] of headRes.headers.entries()) {
      console.log('     ', key + ':', value);
    }
    
    // Test with different paths
    console.log('\n3. Testing path variations...');
    
    // Try without the hash
    const pathParts = url.pathname.split('/');
    const streamId = pathParts[2];
    const timestamp = pathParts[3];
    
    const variations = [
      { name: 'Original', path: url.pathname },
      { name: 'Without .ts extension', path: url.pathname.replace('.ts', '') },
      { name: 'With .m3u8 extension', path: url.pathname.replace('manifest.ts', 'manifest.m3u8') },
      { name: 'index.m3u8', path: url.pathname.replace('manifest.ts', 'index.m3u8') },
      { name: 'playlist.m3u8', path: url.pathname.replace('manifest.ts', 'playlist.m3u8') },
    ];
    
    for (const v of variations) {
      const testUrl = new URL(url);
      testUrl.pathname = v.path;
      testUrl.searchParams.set('u_id', deviceId);
      
      const res = await fetch(testUrl.toString(), {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': 'https://casthill.net/',
          'Origin': 'https://casthill.net',
        },
      });
      
      console.log(`   ${v.name}: ${res.status}`);
      
      if (res.ok) {
        const text = await res.text();
        console.log('     Content:', text.substring(0, 200));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
