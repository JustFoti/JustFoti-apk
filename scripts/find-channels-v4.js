/**
 * Debug - show raw channel names from each page
 */

const PORTAL_URL = process.env.PORTAL_URL || 'http://line.protv.cc/c/';
const MAC_ADDRESS = process.env.MAC_ADDRESS || '00:1A:79:00:00:01';
const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function makeRequest(url, mac, token = null) {
  const params = new URLSearchParams({ url, mac });
  if (token) params.set('token', token);
  const fullUrl = `${CF_PROXY_URL}/iptv/api?${params.toString()}`;
  const response = await fetch(fullUrl);
  const text = await response.text();
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try { return JSON.parse(clean); } catch { return null; }
}

async function handshake(portalUrl, mac) {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'stb');
  url.searchParams.set('action', 'handshake');
  url.searchParams.set('token', '');
  url.searchParams.set('JsHttpRequest', '1-xml');
  return (await makeRequest(url.toString(), mac))?.js?.token;
}

async function getChannels(portalUrl, mac, token, page = 0) {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'itv');
  url.searchParams.set('action', 'get_ordered_list');
  url.searchParams.set('genre', '*');
  url.searchParams.set('p', page.toString());
  url.searchParams.set('JsHttpRequest', '1-xml');
  return (await makeRequest(url.toString(), mac, token))?.js || { data: [] };
}

async function main() {
  const token = await handshake(PORTAL_URL, MAC_ADDRESS);
  if (!token) { console.error('No token!'); return; }
  
  // Check pages 0, 1, 2 and show raw names
  for (let page = 0; page < 3; page++) {
    console.log(`\n=== PAGE ${page} ===`);
    const result = await getChannels(PORTAL_URL, MAC_ADDRESS, token, page);
    console.log(`Channels: ${result.data?.length || 0}`);
    
    if (result.data?.length > 0) {
      console.log('First 5 raw names:');
      result.data.slice(0, 5).forEach(ch => {
        console.log(`  "${ch.name}" (starts with US|: ${ch.name.startsWith('US|')})`);
      });
    }
  }
}

main().catch(console.error);
