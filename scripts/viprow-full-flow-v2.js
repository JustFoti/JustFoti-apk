/**
 * VIPRow Full Flow v2 - Correct token refresh flow
 * 
 * Flow:
 * 1. Fetch VIPRow page -> get embed params
 * 2. Fetch Casthill embed -> get initial tokens and URLs
 * 3. Call boanki.net with X-CSRF-Auth to get fresh tokens
 * 4. Fetch manifest URL with u_id
 */

const fs = require('fs');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getEvent() {
  console.log('1. Fetching VIPRow schedule...');
  const response = await fetch(`${VIPROW_BASE}/sports-big-games`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  const html = await response.text();
  
  const eventMatch = html.match(/href="([^"]+online-stream)"[^>]*role="button"/);
  if (!eventMatch) throw new Error('No events found');
  
  return eventMatch[1];
}

async function getStreamParams(eventUrl) {
  console.log('2. Fetching stream page...');
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  
  const response = await fetch(streamPageUrl, {
    headers: { 'User-Agent': USER_AGENT, 'Referer': VIPROW_BASE }
  });
  const html = await response.text();
  
  const zmid = html.match(/const\s+zmid\s*=\s*"([^"]+)"/)?.[1];
  const pid = html.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
  const edm = html.match(/const\s+edm\s*=\s*"([^"]+)"/)?.[1];
  const config = JSON.parse(html.match(/const siteConfig = (\{[^;]+\});/)?.[1] || '{}');
  
  return { zmid, pid, edm, csrf: config.csrf, csrf_ip: config.csrf_ip, category: config.linkAppendUri, referer: streamPageUrl };
}

async function getCasthillEmbed(params) {
  console.log('3. Fetching Casthill embed...');
  
  const embedParams = new URLSearchParams({
    pid: params.pid, gacat: '', gatxt: params.category, v: params.zmid,
    csrf: params.csrf, csrf_ip: params.csrf_ip,
  });
  const embedUrl = `https://${params.edm}/sd0embed/${params.category}?${embedParams}`;
  
  const response = await fetch(embedUrl, {
    headers: { 'User-Agent': USER_AGENT, 'Referer': params.referer }
  });
  
  return await response.text();
}

function extractStreamData(html) {
  console.log('4. Extracting stream data...');
  
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = scriptPattern.exec(html)) !== null) {
    const content = match[1];
    if (content.includes('isPlayerLoaded') && content.includes('scode')) {
      console.log('   Found stream script, length:', content.length);
      return extractFromScript(content);
    }
  }
  
  throw new Error('Could not find stream script');
}

function extractFromScript(script) {
  // Extract device_id (r)
  const rMatch = script.match(/r="([a-z0-9]+)"/);
  const deviceId = rMatch?.[1];
  
  // Extract stream_id (s)
  const sMatch = script.match(/s="([a-z0-9]{15,})"/);
  const streamId = sMatch?.[1];
  
  // Extract host_id (m)
  const mMatch = script.match(/m="([a-z0-9-]+)"/);
  const hostId = mMatch?.[1];
  
  // Extract the manifest URL (u) - it's double base64 encoded
  const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  let manifestUrl = null;
  if (dMatch) {
    const charCodes = JSON.parse('[' + dMatch[1] + ']');
    const dString = String.fromCharCode(...charCodes);
    const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
    manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  }
  
  // Extract X-CSRF-Auth header (l) - single base64
  const lMatch = script.match(/l=t\("([A-Za-z0-9+/=]+)"\)/);
  const csrfAuth = lMatch ? Buffer.from(lMatch[1], 'base64').toString('utf8') : null;
  
  // Extract base URL (c) - single base64
  const cMatch = script.match(/c=t\("([A-Za-z0-9+/=]+)"\)/);
  const baseUrl = cMatch ? Buffer.from(cMatch[1], 'base64').toString('utf8') : null;
  
  // Extract initial scode (i)
  const iMatch = script.match(/i=e\(\[([0-9,]+)\]\)/);
  const scode = iMatch ? String.fromCharCode(...JSON.parse('[' + iMatch[1] + ']')) : null;
  
  // Extract timestamp (a)
  const aMatch = script.match(/a=parseInt\("(\d+)"/);
  const timestamp = aMatch?.[1];
  
  return {
    deviceId,
    streamId,
    hostId,
    manifestUrl,
    csrfAuth,
    baseUrl,
    scode,
    timestamp,
  };
}

async function refreshTokens(data) {
  console.log('5. Refreshing tokens via boanki.net...');
  
  // Construct the token refresh URL (same as C() function in the script)
  const tokenUrl = `${data.baseUrl}?scode=${encodeURIComponent(data.scode)}&stream=${encodeURIComponent(data.streamId)}&expires=${encodeURIComponent(data.timestamp)}&u_id=${encodeURIComponent(data.deviceId)}&host_id=${encodeURIComponent(data.hostId)}`;
  
  console.log('   Token URL:', tokenUrl);
  console.log('   X-CSRF-Auth:', data.csrfAuth);
  
  const response = await fetch(tokenUrl, {
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'X-CSRF-Auth': data.csrfAuth,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
    credentials: 'include',
  });
  
  console.log('   Status:', response.status);
  console.log('   Headers:');
  for (const [key, value] of response.headers.entries()) {
    console.log('     ', key + ':', value);
  }
  
  const text = await response.text();
  console.log('   Response:', text.substring(0, 500));
  
  if (!response.ok) {
    return null;
  }
  
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchManifest(manifestUrl, deviceId) {
  console.log('6. Fetching manifest...');
  
  const url = new URL(manifestUrl);
  url.searchParams.set('u_id', deviceId);
  
  console.log('   URL:', url.toString());
  
  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
    redirect: 'follow',
  });
  
  console.log('   Status:', response.status);
  
  if (!response.ok) {
    const text = await response.text();
    console.log('   Error:', text.substring(0, 200));
    return null;
  }
  
  const text = await response.text();
  return { url: response.url, content: text };
}

async function main() {
  try {
    const eventUrl = await getEvent();
    console.log('   Event:', eventUrl);
    
    const params = await getStreamParams(eventUrl);
    console.log('   zmid:', params.zmid);
    console.log('   edm:', params.edm);
    
    const embedHtml = await getCasthillEmbed(params);
    console.log('   Embed size:', embedHtml.length, 'bytes');
    
    fs.writeFileSync('casthill-embed-full.html', embedHtml);
    
    const data = extractStreamData(embedHtml);
    console.log('\n   Extracted data:');
    console.log('   - deviceId:', data.deviceId);
    console.log('   - streamId:', data.streamId);
    console.log('   - hostId:', data.hostId);
    console.log('   - baseUrl:', data.baseUrl);
    console.log('   - manifestUrl:', data.manifestUrl);
    console.log('   - timestamp:', data.timestamp);
    console.log('   - scode:', data.scode);
    console.log('   - csrfAuth:', data.csrfAuth?.substring(0, 50) + '...');
    
    // Step 1: Refresh tokens
    const tokens = await refreshTokens(data);
    
    if (tokens) {
      console.log('\n   Fresh tokens:');
      console.log('   - scode:', tokens.scode);
      console.log('   - ts:', tokens.ts);
      console.log('   - device_id:', tokens.device_id);
      
      // Step 2: Fetch manifest with fresh device_id
      const manifest = await fetchManifest(data.manifestUrl, tokens.device_id);
      
      if (manifest) {
        console.log('\n=== SUCCESS ===');
        console.log('Final URL:', manifest.url);
        console.log('\nManifest content (first 1500 chars):');
        console.log(manifest.content.substring(0, 1500));
        
        if (manifest.content.includes('#EXTM3U')) {
          console.log('\n✓ Got valid M3U8 playlist!');
          fs.writeFileSync('viprow-manifest.m3u8', manifest.content);
          console.log('Saved to viprow-manifest.m3u8');
        }
      }
    } else {
      // Try fetching manifest directly with initial device_id
      console.log('\n   Token refresh failed, trying manifest directly...');
      const manifest = await fetchManifest(data.manifestUrl, data.deviceId);
      
      if (manifest) {
        console.log('\n=== SUCCESS ===');
        console.log('Final URL:', manifest.url);
        console.log('\nManifest content (first 1500 chars):');
        console.log(manifest.content.substring(0, 1500));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

main();
