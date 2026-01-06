/**
 * Try to find alternative stream endpoints
 */

const fs = require('fs');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  try {
    // Get fresh embed
    console.log('Fetching fresh embed...\n');
    
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
    
    // Extract all data from the script
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let script = null;
    let match;
    while ((match = scriptPattern.exec(embedHtml)) !== null) {
      if (match[1].includes('isPlayerLoaded') && match[1].includes('scode')) {
        script = match[1];
        break;
      }
    }
    
    // Extract all the values
    const rMatch = script.match(/r="([a-z0-9]+)"/);
    const deviceId = rMatch?.[1];
    
    const sMatch = script.match(/s="([a-z0-9]{15,})"/);
    const streamId = sMatch?.[1];
    
    const mMatch = script.match(/m="([a-z0-9-]+)"/);
    const hostId = mMatch?.[1];
    
    const cMatch = script.match(/c=t\("([A-Za-z0-9+/=]+)"\)/);
    const baseUrl = cMatch ? Buffer.from(cMatch[1], 'base64').toString('utf8') : null;
    
    const iMatch = script.match(/i=e\(\[([0-9,]+)\]\)/);
    const scode = iMatch ? String.fromCharCode(...JSON.parse('[' + iMatch[1] + ']')) : null;
    
    const aMatch = script.match(/a=parseInt\("(\d+)"/);
    const timestamp = aMatch?.[1];
    
    const lMatch = script.match(/l=t\("([A-Za-z0-9+/=]+)"\)/);
    const csrfAuth = lMatch ? Buffer.from(lMatch[1], 'base64').toString('utf8') : null;
    
    const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
    let manifestUrl = null;
    if (dMatch) {
      const charCodes = JSON.parse('[' + dMatch[1] + ']');
      const dString = String.fromCharCode(...charCodes);
      const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
      manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
    }
    
    console.log('Extracted values:');
    console.log('  deviceId:', deviceId);
    console.log('  streamId:', streamId);
    console.log('  hostId:', hostId);
    console.log('  baseUrl:', baseUrl);
    console.log('  scode:', scode);
    console.log('  timestamp:', timestamp);
    console.log('  csrfAuth:', csrfAuth?.substring(0, 50) + '...');
    console.log('  manifestUrl:', manifestUrl);
    
    // Parse manifest URL to understand structure
    const mUrl = new URL(manifestUrl);
    const pathParts = mUrl.pathname.split('/').filter(p => p);
    console.log('\nManifest URL structure:');
    console.log('  Host:', mUrl.hostname);
    console.log('  Path parts:', pathParts);
    
    // The hash in the URL is likely: sha256(streamId + timestamp + secret + clientIP)
    // We can't reproduce it without knowing the secret
    
    // Let's try the boanki.net endpoint which should return fresh tokens
    console.log('\n\nTrying boanki.net token endpoint...');
    
    const tokenUrl = `${baseUrl}?scode=${encodeURIComponent(scode)}&stream=${encodeURIComponent(streamId)}&expires=${encodeURIComponent(timestamp)}&u_id=${encodeURIComponent(deviceId)}&host_id=${encodeURIComponent(hostId)}`;
    
    console.log('Token URL:', tokenUrl);
    
    // The T() function in the script uses these headers
    const tokenRes = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'X-CSRF-Auth': csrfAuth,
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
      },
    });
    
    console.log('Token response status:', tokenRes.status);
    
    // Log all response headers
    console.log('Response headers:');
    for (const [key, value] of tokenRes.headers.entries()) {
      console.log(' ', key + ':', value);
    }
    
    const tokenText = await tokenRes.text();
    console.log('Response body:', tokenText.substring(0, 500));
    
    // If we got JSON, parse it
    if (tokenRes.ok) {
      try {
        const tokenData = JSON.parse(tokenText);
        console.log('\nParsed token data:', tokenData);
      } catch (e) {
        console.log('Not JSON');
      }
    }
    
    // Let's also check if there's a different endpoint pattern
    console.log('\n\nTrying alternative endpoints...');
    
    const alternatives = [
      `https://${hostId}.peulleieo.net/live/${streamId}/index.m3u8`,
      `https://${hostId}.peulleieo.net/hls/${streamId}/index.m3u8`,
      `https://${hostId}.peulleieo.net/${streamId}/index.m3u8`,
      `https://${hostId}.peulleieo.net/stream/${streamId}.m3u8`,
    ];
    
    for (const alt of alternatives) {
      const res = await fetch(alt, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': 'https://casthill.net/',
        },
      });
      console.log(`${alt}: ${res.status}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

main();
