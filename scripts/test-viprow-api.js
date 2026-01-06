/**
 * Test the VIPRow stream API endpoint
 */

// Simulate the API logic locally since we can't call the actual endpoint
const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function extractM3U8FromEmbed(embedUrl, referer) {
  try {
    const embedRes = await fetch(embedUrl, {
      headers: { 
        'User-Agent': USER_AGENT, 
        'Referer': referer,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    if (!embedRes.ok) {
      return { success: false, error: `Failed to fetch embed: ${embedRes.status}` };
    }
    
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
    
    if (!embedScript) {
      return { success: false, error: 'Player script not found in embed' };
    }
    
    const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
    const streamId = embedScript.match(/s="([a-z0-9]+)"/)?.[1];
    const hostId = embedScript.match(/m="([a-z0-9-]+)"/)?.[1];
    const timestamp = embedScript.match(/a=parseInt\("(\d+)"/)?.[1];
    
    const iMatch = embedScript.match(/i=e\(\[([0-9,]+)\]\)/);
    let initialScode = '';
    if (iMatch) {
      const charCodes = JSON.parse('[' + iMatch[1] + ']');
      initialScode = String.fromCharCode(...charCodes);
    }
    
    const cMatch = embedScript.match(/c=t\("([^"]+)"\)/);
    let baseUrl = '';
    if (cMatch) {
      baseUrl = Buffer.from(cMatch[1], 'base64').toString('utf8');
    }
    
    const lMatch = embedScript.match(/l=t\("([^"]+)"\)/);
    let csrfAuth = '';
    if (lMatch) {
      const decoded1 = Buffer.from(lMatch[1], 'base64').toString('utf8');
      csrfAuth = Buffer.from(decoded1, 'base64').toString('utf8');
    }
    
    const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
    let manifestUrl = '';
    if (dMatch) {
      const charCodes = JSON.parse('[' + dMatch[1] + ']');
      const dString = String.fromCharCode(...charCodes);
      const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
      manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
    }
    
    if (!deviceId || !streamId || !baseUrl || !manifestUrl) {
      return { success: false, error: 'Failed to extract stream variables' };
    }
    
    const tokenUrl = `${baseUrl}?scode=${encodeURIComponent(initialScode)}&stream=${encodeURIComponent(streamId)}&expires=${encodeURIComponent(timestamp || '')}&u_id=${encodeURIComponent(deviceId)}&host_id=${encodeURIComponent(hostId || '')}`;
    
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
      return { success: false, error: 'Token refresh unsuccessful' };
    }
    
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
    const keyMatch = manifest.match(/#EXT-X-KEY:[^"]*URI="([^"]+)"/);
    const keyUrl = keyMatch?.[1];
    
    return {
      success: true,
      m3u8Url: url.toString(),
      manifest,
      streamId,
      deviceId: tokenData.device_id || deviceId,
      hostId: hostId || undefined,
      keyUrl,
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function testAPI(eventUrl, linkNum = '1') {
  console.log(`\n=== Testing VIPRow API ===`);
  console.log(`Event: ${eventUrl}`);
  console.log(`Link: ${linkNum}\n`);
  
  // Fetch event page
  const eventPageUrl = `${VIPROW_BASE}${eventUrl}`;
  const eventResponse = await fetch(eventPageUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': VIPROW_BASE,
    },
  });
  
  if (!eventResponse.ok) {
    console.log(`Failed to fetch event page: ${eventResponse.status}`);
    return;
  }
  
  // Fetch stream page
  const streamUrl = `${VIPROW_BASE}${eventUrl}-${linkNum}`;
  const streamResponse = await fetch(streamUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': eventPageUrl,
    },
  });
  
  if (!streamResponse.ok) {
    console.log(`Failed to fetch stream page: ${streamResponse.status}`);
    return;
  }
  
  const streamHtml = await streamResponse.text();
  
  // Extract parameters
  const zmidMatch = streamHtml.match(/const\s+zmid\s*=\s*"([^"]+)"/);
  const pidMatch = streamHtml.match(/const\s+pid\s*=\s*(\d+)/);
  const edmMatch = streamHtml.match(/const\s+edm\s*=\s*"([^"]+)"/);
  const configMatch = streamHtml.match(/const siteConfig = (\{[^;]+\});/);
  
  if (!zmidMatch || !pidMatch || !edmMatch) {
    console.log('Could not extract stream parameters');
    return;
  }
  
  const zmid = zmidMatch[1];
  const pid = parseInt(pidMatch[1]);
  const edm = edmMatch[1];
  
  let csrf = '', csrf_ip = '', category = '';
  if (configMatch) {
    try {
      const config = JSON.parse(configMatch[1]);
      csrf = config.csrf || '';
      csrf_ip = config.csrf_ip || '';
      category = config.linkAppendUri || '';
    } catch {}
  }
  
  // Build embed URL
  const embedParams = new URLSearchParams({
    pid: pid.toString(),
    gacat: '',
    gatxt: category,
    v: zmid,
    csrf,
    csrf_ip,
  });
  const embedUrl = `https://${edm}/sd0embed/${category}?${embedParams.toString()}`;
  
  console.log('Embed URL:', embedUrl);
  
  // Extract m3u8
  const result = await extractM3U8FromEmbed(embedUrl, streamUrl);
  
  if (result.success) {
    console.log('\n✅ SUCCESS!');
    console.log('\nAPI Response would be:');
    console.log(JSON.stringify({
      success: true,
      mode: 'direct',
      m3u8Url: result.m3u8Url,
      streamId: result.streamId,
      deviceId: result.deviceId,
      hostId: result.hostId,
      keyUrl: result.keyUrl,
      headers: {
        'User-Agent': USER_AGENT,
        'Origin': 'https://casthill.net',
        'Referer': 'https://casthill.net/',
      },
    }, null, 2));
    
    console.log('\n--- Manifest Preview ---');
    console.log(result.manifest.substring(0, 600));
  } else {
    console.log('\n❌ FAILED:', result.error);
  }
}

// Test with a real event
async function main() {
  // Get available streams
  const res = await fetch(`${VIPROW_BASE}/sports-big-games`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  const html = await res.text();
  
  const streamLinks = html.match(/href="(\/[^"]*-online-stream)"/g) || [];
  if (streamLinks.length === 0) {
    console.log('No streams available');
    return;
  }
  
  const firstStream = streamLinks[0].match(/href="([^"]+)"/)[1];
  console.log('Testing with:', firstStream);
  
  await testAPI(firstStream, '1');
}

main().catch(console.error);
