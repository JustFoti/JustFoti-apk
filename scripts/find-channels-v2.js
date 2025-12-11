/**
 * Script to find channel numbers for US cable channels in IPTV portal
 * V2 - Fixed to show sample channel names for debugging
 */

const PORTAL_URL = process.env.PORTAL_URL || 'http://line.protv.cc/c/';
const MAC_ADDRESS = process.env.MAC_ADDRESS || '00:1A:79:00:00:01';

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function makeRequest(url, mac, token = null) {
  const params = new URLSearchParams({ url, mac });
  if (token) params.set('token', token);
  
  const cfBase = CF_PROXY_URL.replace(/\/tv\/?$/, '').replace(/\/+$/, '');
  const fullUrl = `${cfBase}/iptv/api?${params.toString()}`;
  
  const response = await fetch(fullUrl);
  const text = await response.text();
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try {
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

async function handshake(portalUrl, mac) {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'stb');
  url.searchParams.set('action', 'handshake');
  url.searchParams.set('token', '');
  url.searchParams.set('JsHttpRequest', '1-xml');
  
  const data = await makeRequest(url.toString(), mac);
  return data?.js?.token;
}

async function getChannels(portalUrl, mac, token, genre = '*', page = 0) {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'itv');
  url.searchParams.set('action', 'get_ordered_list');
  url.searchParams.set('genre', genre);
  url.searchParams.set('p', page.toString());
  url.searchParams.set('JsHttpRequest', '1-xml');
  
  const data = await makeRequest(url.toString(), mac, token);
  return data?.js || { data: [], total_items: 0 };
}

async function main() {
  console.log('IPTV Channel Finder V2');
  console.log('Portal:', PORTAL_URL);
  console.log('');
  
  // Handshake
  console.log('Getting token...');
  const token = await handshake(PORTAL_URL, MAC_ADDRESS);
  if (!token) {
    console.error('Failed to get token!');
    process.exit(1);
  }
  console.log('Token OK');
  console.log('');
  
  // Get first page and show sample channel names
  console.log('Fetching page 1...');
  const result = await getChannels(PORTAL_URL, MAC_ADDRESS, token, '*', 0);
  
  console.log(`Got ${result.data?.length || 0} channels`);
  console.log('');
  console.log('Sample channel names (first 20):');
  console.log('-'.repeat(60));
  
  if (result.data) {
    for (let i = 0; i < Math.min(20, result.data.length); i++) {
      const ch = result.data[i];
      console.log(`#${ch.number} | ${ch.name}`);
    }
  }
  
  console.log('');
  console.log('Looking for US/CA prefixed channels...');
  const usChannels = (result.data || []).filter(ch => {
    const name = ch.name.toUpperCase();
    return name.startsWith('US|') || name.startsWith('CA|') || 
           name.includes('USA') || name.includes('ESPN') || name.includes('CNN');
  });
  
  console.log(`Found ${usChannels.length} potential US channels on page 1`);
  if (usChannels.length > 0) {
    console.log('Samples:');
    usChannels.slice(0, 10).forEach(ch => console.log(`  ${ch.name}`));
  }
}

main().catch(console.error);
