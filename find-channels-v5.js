/**
 * Find US genre and scan all US channels
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

async function getGenres(portalUrl, mac, token) {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'itv');
  url.searchParams.set('action', 'get_genres');
  url.searchParams.set('JsHttpRequest', '1-xml');
  return (await makeRequest(url.toString(), mac, token))?.js || [];
}

async function getChannels(portalUrl, mac, token, genre = '*', page = 0) {
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
  
  // Get genres
  console.log('Getting genres...');
  const genres = await getGenres(PORTAL_URL, MAC_ADDRESS, token);
  
  // Find US/CA/USA genres
  const usGenres = genres.filter(g => {
    const t = g.title?.toUpperCase() || '';
    return t.includes('USA') || t.includes('US ') || t.startsWith('US') || 
           t.includes('CANADA') || t.includes('CA ') || t.startsWith('CA') ||
           t.includes('AMERICAN');
  });
  
  console.log(`\nFound ${usGenres.length} US/CA related genres:`);
  usGenres.forEach(g => console.log(`  ID: ${g.id} - ${g.title}`));
  
  // Scan each US genre
  const allChannels = [];
  
  for (const genre of usGenres) {
    console.log(`\nScanning genre: ${genre.title} (ID: ${genre.id})`);
    let page = 0;
    let genreChannels = 0;
    
    while (page < 100) {
      const result = await getChannels(PORTAL_URL, MAC_ADDRESS, token, genre.id, page);
      if (!result.data?.length) break;
      
      allChannels.push(...result.data);
      genreChannels += result.data.length;
      page++;
      
      if (result.data.length < 14) break;
      await new Promise(r => setTimeout(r, 30));
    }
    console.log(`  Found ${genreChannels} channels`);
  }
  
  console.log(`\n\nTOTAL: ${allChannels.length} US/CA channels`);
  
  // Show sample
  console.log('\nSample channels:');
  allChannels.slice(0, 30).forEach(ch => {
    console.log(`  #${ch.number} | ${ch.name}`);
  });
  
  // Match targets
  const TARGETS = [
    'CNN', 'FOX NEWS', 'MSNBC', 'CNBC', 'ESPN', 'ESPN2', 'FS1', 'NFL NETWORK',
    'USA', 'TNT', 'TBS', 'FX', 'AMC', 'HBO', 'SHOWTIME', 'DISNEY', 'NICK',
    'HGTV', 'FOOD', 'DISCOVERY', 'HISTORY', 'ABC', 'CBS', 'NBC', 'FOX'
  ];
  
  console.log('\n\nMATCHED CHANNELS:');
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
  
  console.log('\n\nJSON:');
  console.log(JSON.stringify(mapping, null, 2));
}

main().catch(console.error);
