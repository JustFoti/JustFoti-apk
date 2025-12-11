const PORTAL_URL = 'http://line.protv.cc/c/';
const MAC = '00:1A:79:00:00:01';
const CF = 'https://media-proxy.vynx.workers.dev';

async function makeRequest(url, mac, token = null) {
  const params = new URLSearchParams({ url, mac });
  if (token) params.set('token', token);
  const r = await fetch(`${CF}/iptv/api?${params}`);
  const t = await r.text();
  return JSON.parse(t.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, ''));
}

async function main() {
  const token = (await makeRequest(PORTAL_URL + 'portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml', MAC)).js.token;
  
  // CA English genre
  let page = 0;
  while (page < 15) {
    const result = (await makeRequest(PORTAL_URL + `portal.php?type=itv&action=get_ordered_list&genre=682&p=${page}&JsHttpRequest=1-xml`, MAC, token)).js;
    if (!result.data?.length) break;
    
    const matches = result.data.filter(ch => ch.name.toUpperCase().includes('CBC'));
    if (matches.length) {
      console.log(`Page ${page}:`);
      matches.forEach(ch => console.log(`  #${ch.number} | ${ch.name} | ID: ${ch.id}`));
    }
    
    page++;
    if (result.data.length < 14) break;
  }
}

main();
