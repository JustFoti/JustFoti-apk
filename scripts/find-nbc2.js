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
  
  // Entertainment genre - look for NBC HD
  const result = (await makeRequest(PORTAL_URL + 'portal.php?type=itv&action=get_ordered_list&genre=672&p=0&JsHttpRequest=1-xml', MAC, token)).js;
  
  console.log('Looking for NBC in Entertainment:');
  result.data
    .filter(ch => {
      const n = ch.name.toUpperCase();
      return (n.includes('NBC') && !n.includes('CNBC')) || n.includes('WNBC');
    })
    .slice(0, 10)
    .forEach(ch => console.log(`#${ch.number} | ${ch.name} | ID: ${ch.id}`));
    
  // Also check News genre
  const result2 = (await makeRequest(PORTAL_URL + 'portal.php?type=itv&action=get_ordered_list&genre=667&p=0&JsHttpRequest=1-xml', MAC, token)).js;
  
  console.log('\nLooking for NBC in News:');
  result2.data
    .filter(ch => {
      const n = ch.name.toUpperCase();
      return (n.includes('NBC') && !n.includes('CNBC'));
    })
    .slice(0, 10)
    .forEach(ch => console.log(`#${ch.number} | ${ch.name} | ID: ${ch.id}`));
}

main();
