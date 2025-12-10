#!/usr/bin/env node
/**
 * Debug: Check raw create_link response
 */

const RPI_PROXY_URL = 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';
const PORTAL = 'http://sbhgoldpro.org';
const MAC = '00:1A:79:00:00:00';

function parseSecureJson(text) {
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try { return JSON.parse(clean); } catch { return null; }
}

async function rpiApi(url, mac, token = null) {
  const params = new URLSearchParams({ url, mac, key: RPI_PROXY_KEY });
  if (token) params.set('token', token);
  const res = await fetch(`${RPI_PROXY_URL}/iptv/api?${params}`);
  return res.text();
}

async function test() {
  // Handshake
  const handshakeUrl = `${PORTAL}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  const handshakeData = parseSecureJson(await rpiApi(handshakeUrl, MAC));
  const token = handshakeData?.js?.token;
  console.log('Token:', token);

  // Get channels
  const channelsUrl = `${PORTAL}/portal.php?type=itv&action=get_ordered_list&genre=*&p=0&JsHttpRequest=1-xml`;
  const channelsData = parseSecureJson(await rpiApi(channelsUrl, MAC, token));
  const channel = channelsData?.js?.data?.[0];
  console.log('\nChannel:', channel?.name);
  console.log('Original cmd:', channel?.cmd);

  // Create link - show raw response
  const cmd = encodeURIComponent(channel.cmd);
  const linkUrl = `${PORTAL}/portal.php?type=itv&action=create_link&cmd=${cmd}&series=&forced_storage=undefined&disable_ad=0&download=0&JsHttpRequest=1-xml`;
  
  console.log('\nCreate link URL:', linkUrl.substring(0, 150) + '...');
  
  const linkText = await rpiApi(linkUrl, MAC, token);
  console.log('\nRaw response:', linkText);
  
  const linkData = parseSecureJson(linkText);
  console.log('\nParsed js.cmd:', linkData?.js?.cmd);
}

test().catch(console.error);
