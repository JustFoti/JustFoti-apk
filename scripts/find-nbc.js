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
  
  // NBC Network genre
  const result = (await makeRequest(PORTAL_URL + 'portal.php?type=itv&action=get_ordered_list&genre=664&p=0&JsHttpRequest=1-xml', MAC, token)).js;
  
  console.log('NBC channels (excluding CNBC):');
  result.data
    .filter(ch => ch.name.toUpperCase().includes('NBC') && !ch.name.toUpperCase().includes('CNBC'))
    .slice(0, 15)
    .forEach(ch => console.log(`#${ch.number} | ${ch.name} | ID: ${ch.id}`));
}

main();
