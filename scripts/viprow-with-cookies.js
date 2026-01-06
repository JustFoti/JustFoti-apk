/**
 * VIPRow with Cookie tracking
 */

const fs = require('fs');

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Store cookies
let cookies = {};

function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return;
  const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const cookieStr of cookieStrings) {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
}

function getCookieHeader() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function main() {
  const startTime = Date.now();
  
  try {
    // Step 1: Get event
    console.log('1. Fetching schedule...');
    const scheduleRes = await fetch(`${VIPROW_BASE}/sports-big-games`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    parseCookies(scheduleRes.headers.get('set-cookie'));
    const scheduleHtml = await scheduleRes.text();
    const eventMatch = scheduleHtml.match(/href="([^"]+online-stream)"[^>]*role="button"/);
    if (!eventMatch) throw new Error('No events found');
    const eventUrl = eventMatch[1];
    console.log('   Event:', eventUrl);
    console.log('   Cookies:', Object.keys(cookies));
    
    // Step 2: Get stream params
    console.log('2. Fetching stream page...');
    const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
    const streamRes = await fetch(streamPageUrl, {
      headers: { 
        'User-Agent': USER_AGENT, 
        'Referer': VIPROW_BASE,
        'Cookie': getCookieHeader(),
      }
    });
    parseCookies(streamRes.headers.get('set-cookie'));
    const streamHtml = await streamRes.text();
    
    const zmid = streamHtml.match(/const\s+zmid\s*=\s*"([^"]+)"/)?.[1];
    const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
    const edm = streamHtml.match(/const\s+edm\s*=\s*"([^"]+)"/)?.[1];
    const config = JSON.parse(streamHtml.match(/const siteConfig = (\{[^;]+\});/)?.[1] || '{}');
    console.log('   zmid:', zmid);
    console.log('   Cookies:', Object.keys(cookies));
    
    // Step 3: Get embed
    console.log('3. Fetching embed...');
    const embedParams = new URLSearchParams({
      pid, gacat: '', gatxt: config.linkAppendUri, v: zmid,
      csrf: config.csrf, csrf_ip: config.csrf_ip,
    });
    const embedUrl = `https://${edm}/sd0embed/${config.linkAppendUri}?${embedParams}`;
    console.log('   Embed URL:', embedUrl);
    
    const embedRes = await fetch(embedUrl, {
      headers: { 
        'User-Agent': USER_AGENT, 
        'Referer': streamPageUrl,
        'Cookie': getCookieHeader(),
      }
    });
    
    // Check for cookies from casthill
    const casthillCookies = embedRes.headers.get('set-cookie');
    console.log('   Casthill set-cookie:', casthillCookies);
    parseCookies(casthillCookies);
    
    const embedHtml = await embedRes.text();
    console.log('   Embed size:', embedHtml.length);
    console.log('   All cookies:', cookies);
    
    // Step 4: Extract data
    console.log('4. Extracting data...');
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let script = null;
    let match;
    while ((match = scriptPattern.exec(embedHtml)) !== null) {
      const content = match[1];
      if (content.includes('isPlayerLoaded') && content.includes('scode')) {
        script = content;
        break;
      }
    }
    
    if (!script) throw new Error('Could not find stream script');
    
    // Extract device_id
    const rMatch = script.match(/r="([a-z0-9]+)"/);
    const deviceId = rMatch?.[1];
    
    // Extract manifest URL
    const dMatch = script.match(/d=t\(e\(\[([0-9,]+)\]\)\)/);
    let manifestUrl = null;
    if (dMatch) {
      const charCodes = JSON.parse('[' + dMatch[1] + ']');
      const dString = String.fromCharCode(...charCodes);
      const dDecoded = Buffer.from(dString, 'base64').toString('utf8');
      manifestUrl = Buffer.from(dDecoded, 'base64').toString('utf8');
    }
    
    // Extract host from manifest URL for cookie domain
    const manifestHost = new URL(manifestUrl).hostname;
    
    console.log('   deviceId:', deviceId);
    console.log('   manifestUrl:', manifestUrl);
    console.log('   manifestHost:', manifestHost);
    
    // Step 5: Fetch manifest with cookies
    console.log('5. Fetching manifest...');
    const url = new URL(manifestUrl);
    url.searchParams.set('u_id', deviceId);
    
    // Try with different header combinations
    const headerVariants = [
      {
        name: 'With casthill referer',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': '*/*',
          'Referer': 'https://casthill.net/',
          'Origin': 'https://casthill.net',
          'Cookie': getCookieHeader(),
        }
      },
      {
        name: 'With embed referer',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': '*/*',
          'Referer': embedUrl,
          'Origin': `https://${edm}`,
          'Cookie': getCookieHeader(),
        }
      },
      {
        name: 'Minimal headers',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': '*/*',
        }
      },
      {
        name: 'With Accept-Encoding',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://casthill.net/',
          'Origin': 'https://casthill.net',
        }
      },
    ];
    
    for (const variant of headerVariants) {
      console.log(`\n   Trying: ${variant.name}`);
      const res = await fetch(url.toString(), {
        headers: variant.headers,
        redirect: 'follow',
      });
      console.log('   Status:', res.status);
      
      if (res.ok) {
        const content = await res.text();
        console.log('\n=== SUCCESS with', variant.name, '===');
        console.log('Content:', content.substring(0, 1000));
        break;
      } else {
        // Check response headers
        console.log('   Response headers:');
        for (const [key, value] of res.headers.entries()) {
          if (key.toLowerCase().includes('cookie') || key.toLowerCase().includes('auth')) {
            console.log('     ', key + ':', value);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
