const PORTAL_URL = 'http://line.protv.cc/c/';
const MAC = '00:1A:79:00:00:01';
const CF = 'https://media-proxy.vynx.workers.dev';

async function makeRequest(url, mac, token = null) {
  const params = new URLSearchParams({ url, mac });
  if (token) params.set('token', token);
  const r = await fetch(`${CF}/iptv/api?${params}`);
  const t = await r.text();
  try { return JSON.parse(t.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '')); } catch { return null; }
}

async function main() {
  const token = (await makeRequest(PORTAL_URL + 'portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml', MAC)).js.token;
  
  // Search CW/MY Network genre for CW
  console.log('Searching for CW...');
  const cw = (await makeRequest(PORTAL_URL + 'portal.php?type=itv&action=get_ordered_list&genre=673&p=0&JsHttpRequest=1-xml', MAC, token)).js;
  cw.data?.filter(ch => ch.name.toUpperCase().includes('CW')).slice(0, 10).forEach(ch => console.log(`  #${ch.number} | ${ch.name} | ID: ${ch.id}`));
  
  // Search for ION
  console.log('\nSearching for ION...');
  const ent = (await makeRequest(PORTAL_URL + 'portal.php?type=itv&action=get_ordered_list&genre=672&p=0&JsHttpRequest=1-xml', MAC, token)).js;
  ent.data?.filter(ch => ch.name.toUpperCase().includes('ION')).slice(0, 10).forEach(ch => console.log(`  #${ch.number} | ${ch.name} | ID: ${ch.id}`));
  
  // Search for CBC
  console.log('\nSearching for CBC...');
  const ca = (await makeRequest(PORTAL_URL + 'portal.php?type=itv&action=get_ordered_list&genre=682&p=0&JsHttpRequest=1-xml', MAC, token)).js;
  ca.data?.filter(ch => ch.name.toUpperCase().includes('CBC')).slice(0, 10).forEach(ch => console.log(`  #${ch.number} | ${ch.name} | ID: ${ch.id}`));
  
  // Search for E!
  console.log('\nSearching for E!...');
  ent.data?.filter(ch => ch.name.toUpperCase().includes('E!')).slice(0, 10).forEach(ch => console.log(`  #${ch.number} | ${ch.name} | ID: ${ch.id}`));
  
  // Search for Nicktoons
  console.log('\nSearching for Nicktoons...');
  const kids = (await makeRequest(PORTAL_URL + 'portal.php?type=itv&action=get_ordered_list&genre=666&p=0&JsHttpRequest=1-xml', MAC, token)).js;
  kids.data?.filter(ch => ch.name.toUpperCase().includes('NICKTOONS')).slice(0, 10).forEach(ch => console.log(`  #${ch.number} | ${ch.name} | ID: ${ch.id}`));
  
  // Search for Univision
  console.log('\nSearching for Univision...');
  const tele = (await makeRequest(PORTAL_URL + 'portal.php?type=itv&action=get_ordered_list&genre=1865&p=0&JsHttpRequest=1-xml', MAC, token)).js;
  tele.data?.filter(ch => ch.name.toUpperCase().includes('UNIVISION')).slice(0, 10).forEach(ch => console.log(`  #${ch.number} | ${ch.name} | ID: ${ch.id}`));
}

main();
