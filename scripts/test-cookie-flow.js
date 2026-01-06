/**
 * Test the complete cookie flow
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Cookie jar
const cookies = {};

function parseCookies(setCookieHeader, domain) {
  if (!setCookieHeader) return;
  const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const cookieStr of cookieStrings) {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[domain] = cookies[domain] || {};
      cookies[domain][name] = value;
      console.log(`   Cookie set: ${domain} -> ${name}=${value.substring(0, 30)}...`);
    }
  }
}

function getCookies(domain) {
  const domainCookies = cookies[domain] || {};
  return Object.entries(domainCookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function main() {
  console.log('=== Complete Cookie Flow Test ===\n');
  
  // Step 1: VIPRow schedule
  console.log('1. Fetching VIPRow schedule...');
  let res = await fetch(`${VIPROW_BASE}/sports-big-games`, {
    headers: { 'User-Agent': USER_AGENT }
  });
  parseCookies(res.headers.get('set-cookie'), 'viprow.nu');
  const scheduleHtml = await res.text();
  const eventMatch = scheduleHtml.match(/href="([^"]+online-stream)"[^>]*role="button"/);
  const eventUrl = eventMatch[1];
  console.log('   Event:', eventUrl);
  
  // Step 2: VIPRow stream page
  console.log('\n2. Fetching VIPRow stream page...');
  const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
  res = await fetch(streamPageUrl, {
    headers: { 
      'User-Agent': USER_AGENT, 
      'Referer': VIPROW_BASE,
      'Cookie': getCookies('viprow.nu'),
    }
  });
  parseCookies(res.headers.get('set-cookie'), 'viprow.nu');
  const streamHtml = await res.text();
  
  const zmid = streamHtml.match(/const\s+zmid\s*=\s*"([^"]+)"/)?.[1];
  const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
  const edm = streamHtml.match(/const\s+edm\s*=\s*"([^"]+)"/)?.[1];
  const config = JSON.parse(streamHtml.match(/const siteConfig = (\{[^;]+\});/)?.[1] || '{}');
  console.log('   zmid:', zmid);
  
  // Step 3: Casthill embed
  console.log('\n3. Fetching Casthill embed...');
  const embedParams = new URLSearchParams({
    pid, gacat: '', gatxt: config.linkAppendUri, v: zmid,
    csrf: config.csrf, csrf_ip: config.csrf_ip,
  });
  const embedUrl = `https://${edm}/sd0embed/${config.linkAppendUri}?${embedParams}`;
  
  res = await fetch(embedUrl, {
    headers: { 
      'User-Agent': USER_AGENT, 
      'Referer': streamPageUrl,
      'Cookie': getCookies('casthill.net'),
    }
  });
  parseCookies(res.headers.get('set-cookie'), 'casthill.net');
  const embedHtml = await res.text();
  
  // Extract script data
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let embedScript = null;
  let match;
  while ((match = scriptPattern.exec(embedHtml)) !== null) {
    if (match[1].includes('isPlayerLoaded') && match[1].includes('scode')) {
      embedScript = match[1];
      break;
    }
  }
  
  const deviceId = embedScript.match(/r="([a-z0-9]+)"/)?.[1];
  const dMatch = embedScript.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
  const charCodes = JSON.parse('[' + dMatch[1] + ']');
  const dString = String.fromCharCode(...charCodes);
  const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
  const manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
  
  const url = new URL(manifestUrl);
  const manifestHost = url.hostname;
  
  console.log('   Manifest host:', manifestHost);
  
  // Step 4: Try to establish session with manifest server
  console.log('\n4. Checking manifest server for cookies...');
  res = await fetch(`https://${manifestHost}/`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
    },
  });
  parseCookies(res.headers.get('set-cookie'), manifestHost);
  console.log('   Status:', res.status);
  
  // Step 5: Try manifest with all cookies
  console.log('\n5. Fetching manifest with all cookies...');
  url.searchParams.set('u_id', deviceId);
  
  // Combine all cookies
  const allCookies = [
    getCookies('viprow.nu'),
    getCookies('casthill.net'),
    getCookies(manifestHost),
  ].filter(c => c).join('; ');
  
  console.log('   All cookies:', allCookies);
  
  res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://casthill.net/',
      'Origin': 'https://casthill.net',
      'Cookie': allCookies,
    },
  });
  
  console.log('   Status:', res.status);
  
  if (res.ok) {
    const text = await res.text();
    console.log('\n=== SUCCESS ===');
    console.log(text.substring(0, 500));
  } else {
    // Try without cookies
    console.log('\n6. Trying without cookies...');
    res = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://casthill.net/',
        'Origin': 'https://casthill.net',
      },
    });
    console.log('   Status:', res.status);
  }
  
  console.log('\n\n=== Cookie Summary ===');
  console.log(JSON.stringify(cookies, null, 2));
}

main().catch(console.error);
