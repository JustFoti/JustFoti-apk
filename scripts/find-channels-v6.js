/**
 * Fast scan - only main US cable genres
 */

const PORTAL_URL = process.env.PORTAL_URL || 'http://line.protv.cc/c/';
const MAC_ADDRESS = process.env.MAC_ADDRESS || '00:1A:79:00:00:01';
const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

// Main cable genres from the scan
const MAIN_GENRES = [
  { id: '673', name: 'US| CW/MY NETWORK' },
  { id: '672', name: 'US| ENTERTAINMENT' },
  { id: '667', name: 'US| NEWS NETWORK' },
  { id: '666', name: 'US| KIDS NETWORK' },
  { id: '680', name: 'US| SPORTS NETWORK' },
  { id: '674', name: 'US| MOVIES NETWORK' },
  { id: '662', name: 'US| ABC NETWORK' },
  { id: '665', name: 'US| CBS NETWORK' },
  { id: '663', name: 'US| FOX NETWORK' },
  { id: '664', name: 'US| NBC NETWORK' },
  { id: '921', name: 'US| PBS NETWORK' },
  { id: '682', name: 'CA| ENGLISH' },
  { id: '671', name: 'CA| SPORT' },
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

async function getChannels(portalUrl, mac, token, genre, page = 0) {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'itv');
  url.searchParams.set('action', 'get_ordered_list');
  url.searchParams.set('genre', genre);
  url.searchParams.set('p', page.toString());
  url.searchParams.set('JsHttpRequest', '1-xml');
  return (await makeRequest(url.toString(), mac, token))?.js || { data: [] };
}

async function main() {
  const token = await handshake(PORTAL_URL, MAC_ADDRESS);
  if (!token) { console.error('No token!'); return; }
  console.log('Token OK\n');
  
  const allChannels = [];
  
  for (const genre of MAIN_GENRES) {
    process.stdout.write(`Scanning ${genre.name}...`);
    let page = 0;
    let count = 0;
    
    while (page < 50) {
      const result = await getChannels(PORTAL_URL, MAC_ADDRESS, token, genre.id, page);
      if (!result.data?.length) break;
      allChannels.push(...result.data);
      count += result.data.length;
      page++;
      if (result.data.length < 14) break;
      await new Promise(r => setTimeout(r, 20));
    }
    console.log(` ${count} channels`);
  }
  
  console.log(`\nTotal: ${allChannels.length} channels\n`);
  
  // Match targets
  const TARGETS = [
    'CNN', 'FOX NEWS', 'MSNBC', 'CNBC', 'ESPN', 'ESPN2', 'FS1', 'NFL NETWORK',
    'USA NETWORK', 'TNT', 'TBS', 'FX', 'AMC', 'HBO', 'SHOWTIME', 'DISNEY', 'NICK',
    'HGTV', 'FOOD', 'DISCOVERY', 'HISTORY', 'ABC', 'CBS', 'NBC', 'FOX',
    'TSN', 'SPORTSNET', 'CBC', 'CTV', 'CARTOON', 'COMEDY', 'BRAVO', 'SYFY',
    'A&E', 'TLC', 'LIFETIME', 'HALLMARK', 'BET', 'MTV', 'VH1', 'WEATHER'
  ];
  
  console.log('MATCHED CHANNELS:');
  console.log('='.repeat(70));
  
  const mapping = {};
  
  for (const target of TARGETS) {
    const matches = allChannels.filter(ch => {
      const name = ch.name.toUpperCase().replace(/^(US|CA)\|\s*/, '');
      return name.includes(target);
    });
    
    if (matches.length > 0) {
      matches.sort((a, b) => {
        const score = n => n.includes('FHD') ? 3 : n.includes('4K') ? 4 : n.includes('HD') ? 2 : 1;
        return score(b.name.toUpperCase()) - score(a.name.toUpperCase());
      });
      
      const best = matches[0];
      console.log(`✓ ${target.padEnd(15)} -> #${best.number} ${best.name}`);
      mapping[target] = { number: best.number, id: best.id, name: best.name };
    } else {
      console.log(`✗ ${target.padEnd(15)} -> NOT FOUND`);
    }
  }
  
  console.log('\n\nJSON OUTPUT:');
  console.log(JSON.stringify(mapping, null, 2));
}

main().catch(console.error);
