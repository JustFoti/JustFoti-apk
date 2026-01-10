#!/usr/bin/env node
/**
 * Test VIPRow full extraction flow including manifest rewriting
 * This simulates what the RPI proxy does
 */

const https = require('https');
const http = require('http');

const VIPROW_BASE = 'https://www.viprow.nu';
const CASTHILL_ORIGIN = 'https://casthill.net';
const CASTHILL_REFERER = 'https://casthill.net/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchWithHeaders(url, headers = {}, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, ...headers },
      timeout: 30000,
    };
    
    const req = client.request(options, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).toString();
        fetchWithHeaders(redirectUrl, headers, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: Buffer.concat(chunks),
          headers: res.headers,
          url: res.url || url,
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

/**
 * Rewrite manifest URLs (same logic as RPI proxy)
 */
function rewriteManifestUrls(manifest, baseUrl, proxyBase) {
  const lines = manifest.split('\n');
  const rewritten = [];
  const isMasterPlaylist = manifest.includes('#EXT-X-STREAM-INF');
  
  for (const line of lines) {
    let newLine = line;
    const trimmed = line.trim();
    
    if (trimmed === '') {
      rewritten.push(line);
      continue;
    }
    
    if (trimmed.includes('URI="')) {
      newLine = trimmed.replace(/URI="([^"]+)"/, (_, url) => {
        const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).toString();
        return `URI="${proxyBase}/viprow/key?url=${encodeURIComponent(fullUrl)}"`;
      });
    } else if (trimmed.startsWith('#')) {
      rewritten.push(line);
      continue;
    } else if (trimmed.length > 0) {
      const fullUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).toString();
      
      if (isMasterPlaylist) {
        newLine = `${proxyBase}/viprow/manifest?url=${encodeURIComponent(fullUrl)}&cf_proxy=${encodeURIComponent(proxyBase)}`;
      } else if (trimmed.includes('.ts') || trimmed.includes('?') || !trimmed.includes('.')) {
        newLine = `${proxyBase}/viprow/segment?url=${encodeURIComponent(fullUrl)}`;
      } else {
        newLine = `${proxyBase}/viprow/manifest?url=${encodeURIComponent(fullUrl)}&cf_proxy=${encodeURIComponent(proxyBase)}`;
      }
    }
    
    rewritten.push(newLine);
  }
  
  return rewritten.join('\n');
}

async function testFullFlow() {
  console.log('=== VIPRow Full Flow Test ===\n');
  
  const PROXY_BASE = 'https://media-proxy.vynx.workers.dev';
  
  // Step 1: Get schedule
  console.log('1. Fetching VIPRow schedule...');
  const scheduleRes = await fetchWithHeaders(`${VIPROW_BASE}/sports-big-games`);
  
  const eventMatch = scheduleRes.data.toString().match(/href="([^"]+online-stream)"[^>]*role="button"/);
  if (!eventMatch) {
    console.log('   ERROR: No events found');
    return;
  }
  const eventUrl = eventMatch[1];
  console.log(`   Event: ${eventUrl}`);
  
  // Step 2: Get stream page
  console.log('\n2. Fetching stream page...');
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  const streamRes = await fetchWithHeaders(streamPageUrl, { 'Referer': VIPROW_BASE });
  
  const streamHtml = streamRes.data.toString();
  const zmid = streamHtml.match(/const\s+zmid\s*=\s*["']([^"']+)["']/)?.[1];
  const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
  const edm = streamHtml.match(/const\s+edm\s*=\s*["']([^"']+)["']/)?.[1];
  
  let csrf = '', csrf_ip = '', category = '';
  const configMatch = streamHtml.match(/const siteConfig = (\{[^;]+\});/);
  if (configMatch) {
    try {
      const config = JSON.parse(configMatch[1]);
      csrf = config.csrf || '';
      csrf_ip = config.csrf_ip || '';
      category = config.linkAppendUri || '';
    } catch {}
  }
  
  // Step 3: Fetch Casthill embed
  console.log('\n3. Fetching Casthill embed...');
  const embedParams = new URLSearchParams({ pid, gacat: '', gatxt: category, v: zmid, csrf, csrf_ip });
  const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams}`;
  
  const embedRes = await fetchWithHeaders(embedUrl, {
    'Referer': streamPageUrl,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  });
  
  const embedHtml = embedRes.data.toString();
  
  // Find player script
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let playerScript = null;
  let match;
  while ((match = scriptPattern.exec(embedHtml)) !== null) {
    const script = match[1];
    if (script.includes('Clappr') && script.includes('isPlayerLoaded') && script.length > 5000) {
      playerScript = script;
      break;
    }
  }
  
  if (!playerScript) {
    console.log('   ERROR: Player script not found');
    return;
  }
  
  // Step 4: Extract variables
  console.log('\n4. Extracting variables...');
  
  let deviceId, streamId, hostId, timestamp, initialScode, baseUrl, csrfAuth, manifestUrl;
  
  const playerIdMatch = playerScript.match(/const\s+playerId\s*=\s*["']([a-z0-9]+)["']/);
  if (playerIdMatch) deviceId = playerIdMatch[1];
  
  const strUnqIdMatch = playerScript.match(/const\s+strUnqId\s*=\s*["']([^"']+)["']/);
  if (strUnqIdMatch) streamId = strUnqIdMatch[1];
  
  const edgeHostIdMatch = playerScript.match(/const\s+edgeHostId\s*=\s*["']([^"']+)["']/);
  if (edgeHostIdMatch) hostId = edgeHostIdMatch[1];
  
  const expireTsMatch = playerScript.match(/const\s+expireTs\s*=\s*parseInt\s*\(\s*["'](\d+)["']/);
  if (expireTsMatch) timestamp = expireTsMatch[1];
  
  const sCodeMatch = playerScript.match(/const\s+sCode\s*=\s*decodeSr\s*\(\s*\[\s*([0-9,\s]+)\s*\]\s*\)/);
  if (sCodeMatch) {
    const charCodes = JSON.parse('[' + sCodeMatch[1].replace(/\s/g, '') + ']');
    initialScode = String.fromCharCode(...charCodes);
  }
  
  const secTokenUrlMatch = playerScript.match(/const\s+secTokenUrl\s*=\s*bota\s*\(\s*["']([^"']+)["']\s*\)/);
  if (secTokenUrlMatch) {
    baseUrl = Buffer.from(secTokenUrlMatch[1], 'base64').toString('utf8');
  }
  
  const csrftokenMatch = playerScript.match(/const\s+csrftoken\s*=\s*["']([^"']+)["']/);
  if (csrftokenMatch) {
    const decoded1 = Buffer.from(csrftokenMatch[1], 'base64').toString('utf8');
    csrfAuth = Buffer.from(decoded1, 'base64').toString('utf8');
  }
  
  const videoSourceMatch = playerScript.match(/const\s+videoSource\s*=\s*bota\s*\(\s*decodeSr\s*\(\s*\[\s*([0-9,\s]+)\s*\]\s*\)\s*\)/);
  if (videoSourceMatch) {
    const charCodes = JSON.parse('[' + videoSourceMatch[1].replace(/\s/g, '') + ']');
    const charString = String.fromCharCode(...charCodes);
    const decoded1 = Buffer.from(charString, 'base64').toString('utf8');
    manifestUrl = Buffer.from(decoded1, 'base64').toString('utf8');
  }
  
  console.log(`   deviceId: ${deviceId}`);
  console.log(`   streamId: ${streamId?.substring(0, 30)}...`);
  console.log(`   hostId: ${hostId}`);
  
  // Step 5: Refresh token
  console.log('\n5. Refreshing token...');
  const tokenUrl = `${baseUrl}?scode=${encodeURIComponent(initialScode || '')}&stream=${encodeURIComponent(streamId)}&expires=${encodeURIComponent(timestamp || '')}&u_id=${encodeURIComponent(deviceId)}&host_id=${encodeURIComponent(hostId || '')}`;
  
  const tokenRes = await fetchWithHeaders(tokenUrl, {
    'Accept': 'application/json',
    'X-CSRF-Auth': csrfAuth || '',
    'Origin': CASTHILL_ORIGIN,
    'Referer': CASTHILL_REFERER,
  });
  
  const tokenData = JSON.parse(tokenRes.data.toString());
  console.log(`   Token success: ${tokenData.success}`);
  
  // Step 6: Fetch master manifest
  console.log('\n6. Fetching master manifest...');
  const url = new URL(manifestUrl);
  url.searchParams.set('u_id', tokenData.device_id || deviceId);
  
  const masterRes = await fetchWithHeaders(url.toString(), {
    'Origin': CASTHILL_ORIGIN,
    'Referer': CASTHILL_REFERER,
  });
  
  const masterManifest = masterRes.data.toString();
  const masterBaseUrl = (masterRes.url || url.toString()).replace(/[^/]+$/, '');
  
  console.log(`   Master manifest: ${masterManifest.length} chars`);
  console.log(`   Base URL: ${masterBaseUrl}`);
  
  // Step 7: Rewrite master manifest
  console.log('\n7. Rewriting master manifest...');
  const rewrittenMaster = rewriteManifestUrls(masterManifest, masterBaseUrl, PROXY_BASE);
  console.log('   Rewritten master manifest:');
  console.log(rewrittenMaster);
  
  // Step 8: Get variant stream URL and fetch media manifest
  console.log('\n8. Fetching media manifest...');
  const variantMatch = masterManifest.match(/^[^#\n][^\n]+$/m);
  if (variantMatch) {
    const variantUrl = variantMatch[0].startsWith('http') 
      ? variantMatch[0] 
      : new URL(variantMatch[0], masterBaseUrl).toString();
    
    console.log(`   Variant URL: ${variantUrl.substring(0, 80)}...`);
    
    const mediaRes = await fetchWithHeaders(variantUrl, {
      'Origin': CASTHILL_ORIGIN,
      'Referer': CASTHILL_REFERER,
    });
    
    const mediaManifest = mediaRes.data.toString();
    const mediaBaseUrl = (mediaRes.url || variantUrl).replace(/[^/]+$/, '');
    
    console.log(`   Media manifest: ${mediaManifest.length} chars`);
    
    // Step 9: Rewrite media manifest
    console.log('\n9. Rewriting media manifest...');
    const rewrittenMedia = rewriteManifestUrls(mediaManifest, mediaBaseUrl, PROXY_BASE);
    console.log('   First 500 chars of rewritten media manifest:');
    console.log(rewrittenMedia.substring(0, 500));
    
    // Check for key URL
    const keyMatch = mediaManifest.match(/#EXT-X-KEY:.*URI="([^"]+)"/);
    if (keyMatch) {
      console.log(`\n   Key URL found: ${keyMatch[1].substring(0, 60)}...`);
      
      // Test key fetch
      const keyUrl = keyMatch[1].startsWith('http') 
        ? keyMatch[1] 
        : new URL(keyMatch[1], mediaBaseUrl).toString();
      
      console.log('\n10. Testing key fetch...');
      const keyRes = await fetchWithHeaders(keyUrl, {
        'Origin': CASTHILL_ORIGIN,
        'Referer': CASTHILL_REFERER,
      });
      
      console.log(`    Key status: ${keyRes.status}`);
      console.log(`    Key length: ${keyRes.data.length} bytes`);
      
      if (keyRes.data.length === 16) {
        console.log(`    Key (hex): ${keyRes.data.toString('hex')}`);
      }
    }
  }
  
  console.log('\n=== ✅ Full Flow Test Complete ===');
}

testFullFlow().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
