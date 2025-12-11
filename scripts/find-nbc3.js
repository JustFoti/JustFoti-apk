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
  
  // Search all pages of NBC Network genre for a generic NBC
  let page = 0;
  const allNbc = [];
  
  while (page < 20) {
    const result = (await makeRequest(PORTAL_URL + `portal.php?type=itv&action=get_ordered_list&genre=664&p=${page}&JsHttpRequest=1-xml`, MAC, token)).js;
    if (!result.data?.length) break;
    
    const matches = result.data.filter(ch => {
      const n = ch.name.toUpperCase();
      // Look for generic NBC (not local affiliates with city names)
      return n.match(/NBC\s*(HD|FHD|4K)/i) && !n.includes('CNBC');
    });
    allNbc.push(...matches);
    
    page++;
    if (result.data.length < 14) break;
  }
  
  console.log('Generic NBC channels found:');
  allNbc.forEach(ch => console.log(`#${ch.number} | ${ch.name} | ID: ${ch.id}`));
  
  // Also look for WNBC (NYC NBC affiliate - often used as national feed)
  page = 0;
  while (page < 20) {
    const result = (await makeRequest(PORTAL_URL + `portal.php?type=itv&action=get_ordered_list&genre=664&p=${page}&JsHttpRequest=1-xml`, MAC, token)).js;
    if (!result.data?.length) break;
    
    const matches = result.data.filter(ch => ch.name.toUpperCase().includes('WNBC') || ch.name.toUpperCase().includes('NEW YORK'));
    if (matches.length) {
      console.log('\nNYC NBC (WNBC):');
      matches.forEach(ch => console.log(`#${ch.number} | ${ch.name} | ID: ${ch.id}`));
    }
    
    page++;
    if (result.data.length < 14) break;
  }
}

main();
