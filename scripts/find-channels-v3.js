/**
 * Full channel scanner - finds all US/CA channels
 */

const PORTAL_URL = process.env.PORTAL_URL || 'http://line.protv.cc/c/';
const MAC_ADDRESS = process.env.MAC_ADDRESS || '00:1A:79:00:00:01';
const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

// Target channels
const TARGETS = [
  'ABC', 'CBS', 'NBC', 'FOX', 'PBS', 'CW',
  'CNN', 'FOX NEWS', 'MSNBC', 'CNBC', 'NEWSMAX', 'C-SPAN', 'HLN', 'WEATHER',
  'ESPN', 'ESPN2', 'ESPNU', 'ESPNEWS', 'FS1', 'FS2', 'NFL NETWORK', 'NFL REDZONE',
  'MLB NETWORK', 'NBA TV', 'NHL NETWORK', 'GOLF', 'TENNIS', 'CBS SPORTS',
  'USA', 'TNT', 'TBS', 'FX', 'AMC', 'BRAVO', 'SYFY', 'LIFETIME', 'HALLMARK',
  'COMEDY CENTRAL', 'BET', 'FREEFORM', 'TRUTV',
  'HBO', 'CINEMAX', 'SHOWTIME', 'STARZ', 'ENCORE', 'TCM',
  'DISNEY', 'NICKELODEON', 'NICK', 'CARTOON NETWORK',
  'HGTV', 'FOOD NETWORK', 'TLC', 'TRAVEL', 'A&E', 'DISCOVERY', 'HISTORY',
  'NAT GEO', 'ANIMAL PLANET', 'MTV', 'VH1',
  'TSN', 'SPORTSNET', 'CBC', 'CTV'
];

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
  console.log('Full Channel Scanner');
  
  const token = await handshake(PORTAL_URL, MAC_ADDRESS);
  if (!token) { console.error('No token!'); return; }
  console.log('Token OK\n');
  
  // Collect all US/CA channels
  const allChannels = [];
  let page = 0;
  
  while (page < 500) {
    const result = await getChannels(PORTAL_URL, MAC_ADDRESS, token, page);
    if (!result.data?.length) break;
    
    const usca = result.data.filter(ch => {
      const n = ch.name.toUpperCase();
      return n.startsWith('US|') || n.startsWith('CA|');
    });
    allChannels.push(...usca);
    
    process.stdout.write(`\rPage ${page + 1}: ${allChannels.length} US/CA channels`);
    page++;
    if (result.data.length < 14) break;
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log(`\n\nTotal: ${allChannels.length} US/CA channels\n`);
  
  // Match targets
  console.log('MATCHED CHANNELS:');
  console.log('='.repeat(70));
  
  const mapping = {};
  
  for (const target of TARGETS) {
    const matches = allChannels.filter(ch => {
      const name = ch.name.toUpperCase();
      // Remove prefix for matching
      const clean = name.replace(/^(US|CA)\|\s*/, '');
      return clean.includes(target.toUpperCase());
    });
    
    if (matches.length > 0) {
      // Sort: FHD > 4K > HD > SD
      matches.sort((a, b) => {
        const score = n => n.includes('FHD') ? 3 : n.includes('4K') ? 4 : n.includes('HD') ? 2 : 1;
        return score(b.name.toUpperCase()) - score(a.name.toUpperCase());
      });
      
      const best = matches[0];
      console.log(`✓ ${target.padEnd(20)} -> #${best.number} ${best.name}`);
      mapping[target] = { number: best.number, id: best.id, name: best.name };
    }
  }
  
  console.log('\n\nJSON OUTPUT:');
  console.log(JSON.stringify(mapping, null, 2));
}

main().catch(console.error);
