const PORTAL_URL = 'http://line.protv.cc/c/';
const MAC = '00:1A:79:00:00:01';
const CF = 'https://media-proxy.vynx.workers.dev';

const GENRES = ['672', '667', '666', '680', '674', '673', '682', '1865'];

async function makeRequest(url, mac, token = null) {
  const params = new URLSearchParams({ url, mac });
  if (token) params.set('token', token);
  const r = await fetch(`${CF}/iptv/api?${params}`);
  const t = await r.text();
  try { return JSON.parse(t.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '')); } catch { return null; }
}

async function main() {
  const token = (await makeRequest(PORTAL_URL + 'portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml', MAC)).js.token;
  
  const allChannels = [];
  for (const genre of GENRES) {
    let page = 0;
    while (page < 20) {
      const result = (await makeRequest(PORTAL_URL + `portal.php?type=itv&action=get_ordered_list&genre=${genre}&p=${page}&JsHttpRequest=1-xml`, MAC, token))?.js;
      if (!result?.data?.length) break;
      allChannels.push(...result.data);
      page++;
      if (result.data.length < 14) break;
    }
  }
  
  console.log(`Total channels: ${allChannels.length}\n`);
  
  const searches = ['E!', 'NICKTOONS', 'UNIVISION', 'ION', 'GLOBAL', 'ESPN DEPORTES', 'FOX DEPORTES'];
  
  for (const term of searches) {
    console.log(`\n${term}:`);
    const matches = allChannels.filter(ch => ch.name.toUpperCase().includes(term));
    if (matches.length === 0) {
      console.log('  NOT FOUND');
    } else {
      matches.slice(0, 5).forEach(ch => console.log(`  #${ch.number} | ${ch.name} | ID: ${ch.id}`));
    }
  }
}

main();
