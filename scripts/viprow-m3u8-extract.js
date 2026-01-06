/**
 * VIPRow/Casthill M3U8 Direct Extraction
 * 
 * This script extracts the raw m3u8 stream URL from VIPRow without using iframes.
 * 
 * Flow:
 * 1. Get VIPRow stream page → extract embed parameters
 * 2. Fetch Casthill embed → extract stream variables
 * 3. Call boanki.net token endpoint → get fresh scode/timestamp
 * 4. Construct manifest URL → fetch m3u8 playlist
 * 5. Return playable m3u8 URL with all required parameters
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Extract m3u8 URL from a VIPRow stream page
 * @param {string} streamPageUrl - Full URL to the VIPRow stream page (e.g., https://www.viprow.nu/nba/event-online-stream-1)
 * @returns {Promise<{success: boolean, m3u8Url?: string, manifest?: string, error?: string}>}
 */
async function extractM3U8(streamPageUrl) {
  try {
    console.log('Step 1: Fetching VIPRow stream page...');
    const streamRes = await fetch(streamPageUrl, {
      headers: { 
        'User-Agent': USER_AGENT, 
        'Referer': VIPROW_BASE 
      }
    });
    
    if (!streamRes.ok) {
      return { success: false, error: `Failed to fetch stream page: ${streamRes.status}` };
    }
    
    const streamHtml = await streamRes.text();
    
    // Extract embed parameters
    const zmid = streamHtml.match(/const\s+zmid\s*=\s*"([^"]+)"/)?.[1];
    const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
    const edm = streamHtml.match(/const\s+edm\s*=\s*"([^"]+)"/)?.[1];
    const configMatch = streamHtml.match(/const siteConfig = (\{[^;]+\});/);
    
    if (!zmid || !pid || !edm || !configMatch) {
      return { success: false, error: 'Failed to extract embed parameters from stream page' };
    }
    
    const config = JSON.parse(configMatch[1]);
    
    // Construct embed URL
    const embedParams = new URLSearchParams({
      pid,
      gacat: '',
      gatxt: config.linkAppendUri,
      v: zmid,
      csrf: config.csrf,
      csrf_ip: config.csrf_ip,
    });
    const embedUrl = `https://${edm}/sd0embed/${config.linkAppendUri}?${embedParams}`;
    
    console.log('Step 2: Fetching Casthill embed...');
    const embedRes = await fetch(embedUrl, {
      headers: { 
        'User-Agent': USER_AGENT, 
        'Referer': streamPageUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    if (!embedRes.ok) {
      return { success: false, error: `Failed to fetch embed page: ${embedRes.status}` };
    }
    
    const embedHtml = await embedRes.text();
    
    // Find the player script
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let embedScript = null;
    let match;
    while ((match = scriptPattern.exec(embedHtml)) !== null) {
      if (match[1].includes('isPlayerLoaded') && match[1].includes('scode')) {
        embedScript = match[1];
        break;
      }
    }
    
    if (!embedScript) {
      return { success: false, error: 'Player script not found in embed page' };
    }
    
    // Extract variables from script
    const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
    const streamId = embedScript.match(/s="([a-z0-9]+)"/)?.[1];
    const hostId = embedScript.match(/m="([a-z0-9-]+)"/)?.[1];
    const timestamp = embedScript.match(/a=parseInt\("(\d+)"/)?.[1];
    
    // Extract initial scode
    const iMatch = embedScript.match(/i=e\(\[([0-9,]+)\]\)/);
    let initialScode = '';
    if (iMatch) {
      const charCodes = JSON.parse('[' + iMatch[1] + ']');
      initialScode = String.fromCharCode(...charCodes);
    }
    
    // Extract base URL (boanki.net)
    const cMatch = embedScript.match(/c=t\("([^"]+)"\)/);
    let baseUrl = '';
    if (cMatch) {
      baseUrl = Buffer.from(cMatch[1], 'base64').toString('utf8');
    }
    
    // Extract X-CSRF-Auth (double base64 encoded)
    const lMatch = embedScript.match(/l=t\("([^"]+)"\)/);
    let csrfAuth = '';
    if (lMatch) {
      const decoded1 = Buffer.from(lMatch[1], 'base64').toString('utf8');
      csrfAuth = Buffer.from(decoded1, 'base64').toString('utf8');
    }
    
    // Extract manifest URL (double base64 encoded)
    const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
    let manifestUrl = '';
    if (dMatch) {
      const charCodes = JSON.parse('[' + dMatch[1] + ']');
      const dString = String.fromCharCode(...charCodes);
      const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
      manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
    }
    
    if (!deviceId || !streamId || !baseUrl || !manifestUrl) {
      return { success: false, error: 'Failed to extract stream variables from embed script' };
    }
    
    console.log('Step 3: Refreshing token via boanki.net...');
    const tokenUrl = `${baseUrl}?scode=${encodeURIComponent(initialScode)}&stream=${encodeURIComponent(streamId)}&expires=${encodeURIComponent(timestamp)}&u_id=${encodeURIComponent(deviceId)}&host_id=${encodeURIComponent(hostId)}`;
    
    const tokenRes = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'X-CSRF-Auth': csrfAuth,
        'Origin': 'https://casthill.net',
        'Referer': 'https://casthill.net/',
      },
    });
    
    if (!tokenRes.ok) {
      return { success: false, error: `Token refresh failed: ${tokenRes.status}` };
    }
    
    const tokenData = await tokenRes.json();
    
    if (!tokenData.success) {
      return { success: false, error: 'Token refresh returned unsuccessful response' };
    }
    
    console.log('Step 4: Fetching manifest...');
    // Add u_id to manifest URL
    const url = new URL(manifestUrl);
    url.searchParams.set('u_id', tokenData.device_id || deviceId);
    
    const manifestRes = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': 'https://casthill.net',
        'Referer': 'https://casthill.net/',
      },
    });
    
    if (!manifestRes.ok) {
      return { success: false, error: `Manifest fetch failed: ${manifestRes.status}` };
    }
    
    const manifest = await manifestRes.text();
    
    // Extract key URL from manifest
    const keyMatch = manifest.match(/URI="([^"]+)"/);
    const keyUrl = keyMatch?.[1];
    
    console.log('SUCCESS! Stream extracted.');
    
    return {
      success: true,
      m3u8Url: url.toString(),
      manifest,
      streamId,
      deviceId: tokenData.device_id || deviceId,
      hostId,
      keyUrl,
      tokenData,
      // Headers needed to play the stream
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': 'https://casthill.net',
        'Referer': 'https://casthill.net/',
      }
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get list of available streams from VIPRow
 */
async function getAvailableStreams() {
  const res = await fetch(`${VIPROW_BASE}/sports-big-games`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  const html = await res.text();
  
  const streams = [];
  // Match href="/category/event-name-online-stream"
  const regex = /href="(\/[^"]*-online-stream)"/g;
  let match;
  const seen = new Set();
  while ((match = regex.exec(html)) !== null) {
    const url = match[1];
    if (!seen.has(url)) {
      seen.add(url);
      // Extract title from URL
      const parts = url.split('/');
      const slug = parts[parts.length - 1].replace('-online-stream', '');
      const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      streams.push({
        url: `${VIPROW_BASE}${url}-1`,
        title
      });
    }
  }
  
  return streams;
}

// Main execution
async function main() {
  console.log('=== VIPRow M3U8 Direct Extraction ===\n');
  
  // Get available streams
  console.log('Finding available streams...\n');
  const streams = await getAvailableStreams();
  
  if (streams.length === 0) {
    console.log('No streams currently available');
    return;
  }
  
  console.log(`Found ${streams.length} streams:`);
  streams.slice(0, 5).forEach((s, i) => console.log(`  ${i + 1}. ${s.title}`));
  if (streams.length > 5) console.log(`  ... and ${streams.length - 5} more`);
  
  // Extract first stream
  console.log(`\nExtracting: ${streams[0].title}`);
  console.log(`URL: ${streams[0].url}\n`);
  
  const result = await extractM3U8(streams[0].url);
  
  if (result.success) {
    console.log('\n=== EXTRACTION SUCCESSFUL ===');
    console.log('\nM3U8 URL:', result.m3u8Url);
    console.log('\nStream ID:', result.streamId);
    console.log('Device ID:', result.deviceId);
    console.log('Host ID:', result.hostId);
    console.log('\nRequired Headers:');
    Object.entries(result.headers).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log('\nManifest Preview:');
    console.log(result.manifest.substring(0, 800));
  } else {
    console.log('\n=== EXTRACTION FAILED ===');
    console.log('Error:', result.error);
  }
}

// Export for use as module
module.exports = { extractM3U8, getAvailableStreams };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
