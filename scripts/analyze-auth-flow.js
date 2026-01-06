/**
 * Deep analysis of the Casthill auth flow
 * 
 * From casthill-script-2.js, the flow is:
 * 
 * 1. Initial values from embed:
 *    - r = device_id (random 32-char)
 *    - i = initial scode (MD5 hash)
 *    - a = timestamp
 *    - s = stream_id
 *    - c = base URL (boanki.net)
 *    - l = X-CSRF-Auth header
 *    - d = manifest URL (double base64)
 *    - m = host_id
 * 
 * 2. Session storage check:
 *    - Checks for existing session with matching host_id
 *    - If found and not expired, uses cached scode
 * 
 * 3. Token refresh (T function):
 *    - Calls boanki.net with scode, stream, expires, u_id, host_id
 *    - Headers: Accept: application/json, X-CSRF-Auth: <token>
 *    - credentials: 'include' (sends cookies!)
 *    - Returns: { scode, ts, device_id }
 * 
 * 4. Manifest fetch (k function):
 *    - Adds u_id param to manifest URL
 *    - Simple fetch with mode: cors
 * 
 * KEY INSIGHT: The boanki.net call uses credentials: 'include'
 * This means it needs cookies from boanki.net domain!
 * 
 * But wait - how does the browser get boanki.net cookies?
 * The embed page is on casthill.net, not boanki.net...
 * 
 * Let's trace the cookie flow!
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function analyzeFlow() {
  console.log('=== Analyzing Casthill Auth Flow ===\n');
  
  // Step 1: Get embed page
  const scheduleRes = await fetch(`${VIPROW_BASE}/sports-big-games`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  const scheduleHtml = await scheduleRes.text();
  const eventMatch = scheduleHtml.match(/href="([^"]+online-stream)"[^>]*role="button"/);
  if (!eventMatch) {
    console.log('No events found');
    return;
  }
  const eventUrl = eventMatch[1];
  
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  console.log('Stream page:', streamPageUrl);
  
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
  console.log('\nEmbed URL:', embedUrl);
  
  // Step 2: Fetch embed and check for Set-Cookie
  console.log('\n--- Fetching embed page ---');
  const embedRes = await fetch(embedUrl, {
    headers: { 
      'User-Agent': USER_AGENT, 
      'Referer': streamPageUrl,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });
  
  console.log('Embed response status:', embedRes.status);
  console.log('Set-Cookie headers:', embedRes.headers.get('set-cookie'));
  
  const embedHtml = await embedRes.text();
  
  // Check for any iframes or external resources that might set cookies
  const iframes = embedHtml.match(/<iframe[^>]*src="([^"]+)"[^>]*>/gi) || [];
  console.log('\nIframes found:', iframes.length);
  iframes.forEach(iframe => console.log('  -', iframe));
  
  // Check for any script sources
  const scriptSrcs = embedHtml.match(/<script[^>]*src="([^"]+)"[^>]*>/gi) || [];
  console.log('\nExternal scripts:', scriptSrcs.length);
  scriptSrcs.forEach(src => console.log('  -', src));
  
  // Check for any img/pixel tracking that might set cookies
  const imgs = embedHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/gi) || [];
  console.log('\nImages:', imgs.length);
  imgs.forEach(img => console.log('  -', img));
  
  // Extract the inline script
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
    console.log('\nNo player script found!');
    return;
  }
  
  // Extract all the variables
  const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
  const streamId = embedScript.match(/s="([a-z0-9]+)"/)?.[1];
  const hostId = embedScript.match(/m="([a-z0-9-]+)"/)?.[1];
  const timestamp = embedScript.match(/a=parseInt\("(\d+)"/)?.[1];
  
  // Extract scode (initial)
  const iMatch = embedScript.match(/i=e\(\[([0-9,]+)\]\)/);
  let initialScode = '';
  if (iMatch) {
    const charCodes = JSON.parse('[' + iMatch[1] + ']');
    initialScode = String.fromCharCode(...charCodes);
  }
  
  // Extract base URL
  const cMatch = embedScript.match(/c=t\("([^"]+)"\)/);
  let baseUrl = '';
  if (cMatch) {
    baseUrl = Buffer.from(cMatch[1], 'base64').toString('utf8');
  }
  
  // Extract X-CSRF-Auth
  const lMatch = embedScript.match(/l=t\("([^"]+)"\)/);
  let csrfAuth = '';
  if (lMatch) {
    // It's double base64 encoded
    const decoded1 = Buffer.from(lMatch[1], 'base64').toString('utf8');
    csrfAuth = Buffer.from(decoded1, 'base64').toString('utf8');
  }
  
  // Extract manifest URL
  const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  let manifestUrl = '';
  if (dMatch) {
    const charCodes = JSON.parse('[' + dMatch[1] + ']');
    const dString = String.fromCharCode(...charCodes);
    const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
    manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  }
  
  console.log('\n=== Extracted Values ===');
  console.log('Device ID:', deviceId);
  console.log('Stream ID:', streamId);
  console.log('Host ID:', hostId);
  console.log('Timestamp:', timestamp);
  console.log('Initial scode:', initialScode);
  console.log('Base URL:', baseUrl);
  console.log('X-CSRF-Auth:', csrfAuth.substring(0, 50) + '...');
  console.log('Manifest URL:', manifestUrl);
  
  // Step 3: Try to understand the token flow
  // The script does: credentials: 'include' on boanki.net
  // But how does the browser have boanki.net cookies?
  
  console.log('\n=== Token URL Construction ===');
  const tokenUrl = `${baseUrl}?scode=${encodeURIComponent(initialScode)}&stream=${encodeURIComponent(streamId)}&expires=${encodeURIComponent(timestamp)}&u_id=${encodeURIComponent(deviceId)}&host_id=${encodeURIComponent(hostId)}`;
  console.log('Token URL:', tokenUrl);
  
  // Try fetching the token endpoint
  console.log('\n--- Attempting token fetch ---');
  try {
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
    console.log('Token response status:', tokenRes.status);
    console.log('Token response headers:', Object.fromEntries(tokenRes.headers.entries()));
    const tokenText = await tokenRes.text();
    console.log('Token response body:', tokenText.substring(0, 500));
  } catch (err) {
    console.log('Token fetch error:', err.message);
  }
  
  // Step 4: Check if there's a preflight or other mechanism
  console.log('\n=== Checking for hidden auth mechanisms ===');
  
  // Look for any fetch calls in the script
  const fetchCalls = embedScript.match(/fetch\([^)]+\)/g) || [];
  console.log('\nFetch calls in script:', fetchCalls.length);
  
  // Look for XMLHttpRequest
  const xhrCalls = embedScript.match(/XMLHttpRequest/g) || [];
  console.log('XMLHttpRequest usage:', xhrCalls.length);
  
  // Look for WebSocket
  const wsCalls = embedScript.match(/WebSocket/g) || [];
  console.log('WebSocket usage:', wsCalls.length);
  
  // The script mentions SwarmCloud P2P - check for that
  const p2pRefs = embedScript.match(/P2P|swarm|peer/gi) || [];
  console.log('P2P references:', p2pRefs.length);
  
  // Check for any cookie manipulation
  const cookieRefs = embedScript.match(/document\.cookie|cookie/gi) || [];
  console.log('Cookie references:', cookieRefs.length);
  
  // KEY FINDING: Look at the k() function more closely
  // It fetches the manifest AFTER T() succeeds
  // T() is the token refresh that returns { scode, ts, device_id }
  // But T() requires credentials: 'include' which needs cookies
  
  console.log('\n=== HYPOTHESIS ===');
  console.log('The flow seems to be:');
  console.log('1. Embed page loads with initial scode/timestamp');
  console.log('2. Script calls T() to refresh token via boanki.net');
  console.log('3. T() uses credentials: include (needs cookies)');
  console.log('4. If T() succeeds, k() fetches manifest with new scode');
  console.log('');
  console.log('BUT: How does browser get boanki.net cookies?');
  console.log('- The embed is on casthill.net');
  console.log('- boanki.net is a different domain');
  console.log('- Cross-origin cookies require SameSite=None; Secure');
  console.log('');
  console.log('POSSIBILITY 1: The initial scode/timestamp are valid for first request');
  console.log('POSSIBILITY 2: There is a hidden iframe/pixel that sets cookies');
  console.log('POSSIBILITY 3: The server validates something else (TLS fingerprint?)');
  
  // Let's try the manifest with the INITIAL values (before token refresh)
  console.log('\n=== Testing manifest with initial values ===');
  const url = new URL(manifestUrl);
  url.searchParams.set('u_id', deviceId);
  
  console.log('Manifest URL with u_id:', url.toString());
  
  const manifestRes = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Origin': 'https://casthill.net',
      'Referer': 'https://casthill.net/',
    },
  });
  console.log('Manifest status:', manifestRes.status);
  
  if (manifestRes.ok) {
    const text = await manifestRes.text();
    console.log('SUCCESS! Manifest content:');
    console.log(text.substring(0, 500));
  } else {
    console.log('Failed. Response:', await manifestRes.text().catch(() => '(no body)'));
  }
}

analyzeFlow().catch(console.error);
