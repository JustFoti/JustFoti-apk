/**
 * Complete scan with all sports genres
 */

const PORTAL_URL = process.env.PORTAL_URL || 'http://line.protv.cc/c/';
const MAC_ADDRESS = process.env.MAC_ADDRESS || '00:1A:79:00:00:01';
const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

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
  { id: '1030', name: 'US| BALLY NETWORK' },
  { id: '676', name: 'US| NBA PACKAGE' },
  { id: '677', name: 'US| NHL PACKAGE' },
  { id: '675', name: 'US| NFL PACKAGE' },
  { id: '804', name: 'US| MLB PACKAGE' },
  { id: '1118', name: 'US| ESPN PLUS' },
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
  
  // Better target matching
  const TARGETS = [
    { key: 'CNN', search: ['CNN'] },
    { key: 'FOX NEWS', search: ['FOX NEWS'] },
    { key: 'MSNBC', search: ['MSNBC'] },
    { key: 'CNBC', search: ['CNBC'] },
    { key: 'ESPN', search: ['ESPN HD', 'ESPN FHD'] },
    { key: 'ESPN2', search: ['ESPN 2', 'ESPN2'] },
    { key: 'ESPNU', search: ['ESPNU', 'ESPN U'] },
    { key: 'FS1', search: ['FOX SPORTS 1', 'FS1'] },
    { key: 'FS2', search: ['FOX SPORTS 2', 'FS2'] },
    { key: 'NFL NETWORK', search: ['NFL NETWORK'] },
    { key: 'NFL REDZONE', search: ['NFL REDZONE', 'REDZONE'] },
    { key: 'MLB NETWORK', search: ['MLB NETWORK'] },
    { key: 'NBA TV', search: ['NBA TV'] },
    { key: 'NHL NETWORK', search: ['NHL NETWORK'] },
    { key: 'USA', search: ['USA NETWORK'] },
    { key: 'TNT', search: ['TNT HD', 'TNT FHD'] },
    { key: 'TBS', search: ['TBS HD', 'TBS FHD'] },
    { key: 'FX', search: ['FX HD', 'FX FHD'] },
    { key: 'AMC', search: ['AMC HD', 'AMC FHD'] },
    { key: 'HBO', search: ['HBO HD', 'HBO FHD'] },
    { key: 'SHOWTIME', search: ['SHOWTIME HD', 'SHOWTIME FHD'] },
    { key: 'STARZ', search: ['STARZ HD', 'STARZ FHD'] },
    { key: 'DISNEY', search: ['DISNEY CHANNEL'] },
    { key: 'NICK', search: ['NICKELODEON'] },
    { key: 'CARTOON', search: ['CARTOON NETWORK'] },
    { key: 'HGTV', search: ['HGTV'] },
    { key: 'FOOD', search: ['FOOD NETWORK'] },
    { key: 'DISCOVERY', search: ['DISCOVERY HD', 'DISCOVERY FHD'] },
    { key: 'HISTORY', search: ['HISTORY HD', 'HISTORY FHD'] },
    { key: 'ABC', search: ['ABC HD', 'ABC FHD'] },
    { key: 'CBS', search: ['CBS HD', 'CBS FHD'] },
    { key: 'NBC', search: ['NBC HD', 'NBC FHD'] },
    { key: 'FOX', search: ['FOX HD', 'FOX FHD'] },
    { key: 'TSN1', search: ['TSN1', 'TSN 1'] },
    { key: 'TSN2', search: ['TSN2', 'TSN 2'] },
    { key: 'SPORTSNET ONE', search: ['SPORTSNET ONE'] },
    { key: 'CBC', search: ['CBC HD', 'CBC FHD'] },
    { key: 'CTV', search: ['CTV HD', 'CTV FHD'] },
    { key: 'COMEDY', search: ['COMEDY CENTRAL'] },
    { key: 'BRAVO', search: ['BRAVO'] },
    { key: 'SYFY', search: ['SYFY'] },
    { key: 'A&E', search: ['A&E'] },
    { key: 'TLC', search: ['TLC'] },
    { key: 'LIFETIME', search: ['LIFETIME HD'] },
    { key: 'HALLMARK', search: ['HALLMARK CHANNEL', 'HALLMARK HD'] },
    { key: 'BET', search: ['BET HD'] },
    { key: 'MTV', search: ['MTV HD'] },
    { key: 'VH1', search: ['VH1'] },
    { key: 'WEATHER', search: ['WEATHER CHANNEL'] },
    { key: 'GOLF', search: ['GOLF CHANNEL'] },
    { key: 'TENNIS', search: ['TENNIS CHANNEL'] },
    { key: 'CBS SPORTS', search: ['CBS SPORTS'] },
  ];
  
  console.log('MATCHED CHANNELS:');
  console.log('='.repeat(70));
  
  const mapping = {};
  
  for (const target of TARGETS) {
    let matches = [];
    
    for (const search of target.search) {
      const found = allChannels.filter(ch => {
        const name = ch.name.toUpperCase().replace(/^(US|CA)\|\s*/, '');
        return name.includes(search);
      });
      matches.push(...found);
    }
    
    // Dedupe
    matches = [...new Map(matches.map(m => [m.id, m])).values()];
    
    if (matches.length > 0) {
      matches.sort((a, b) => {
        const score = n => n.includes('FHD') ? 3 : n.includes('4K') ? 4 : n.includes('HD') ? 2 : 1;
        return score(b.name.toUpperCase()) - score(a.name.toUpperCase());
      });
      
      const best = matches[0];
      console.log(`✓ ${target.key.padEnd(15)} -> #${best.number} ${best.name}`);
      mapping[target.key] = { number: best.number, id: best.id, name: best.name };
    } else {
      console.log(`✗ ${target.key.padEnd(15)} -> NOT FOUND`);
    }
  }
  
  console.log('\n\nJSON OUTPUT:');
  console.log(JSON.stringify(mapping, null, 2));
}

main().catch(console.error);
