#!/usr/bin/env node
/**
 * Check account status and try different channels
 */

const RPI_PROXY_URL = 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';
const TEST_PORTAL = 'http://skunkytv.live';
const TEST_MAC = '00:1A:79:00:00:0C';

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
  console.log('Checking account status...\n');
  
  // 1. Handshake
  const handshakeUrl = `${TEST_PORTAL}/portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  const handshakeText = await rpiApi(handshakeUrl, TEST_MAC);
  const handshakeData = parseSecureJson(handshakeText);
  const token = handshakeData?.js?.token;
  if (!token) { console.log('❌ No token'); return; }
  console.log(`✓ Token: ${token}`);

  // 2. Get profile
  console.log('\nGetting profile...');
  const profileUrl = `${TEST_PORTAL}/portal.php?type=stb&action=get_profile&hd=1&num_banks=2&stb_type=MAG250&JsHttpRequest=1-xml`;
  const profileText = await rpiApi(profileUrl, TEST_MAC, token);
  const profileData = parseSecureJson(profileText);
  
  if (profileData?.js) {
    const p = profileData.js;
    console.log(`  Status: ${p.status}`);
    console.log(`  Blocked: ${p.blocked}`);
    console.log(`  Expire: ${p.expire_billing_date || p.tariff_expired_date || 'N/A'}`);
    console.log(`  Playback Limit: ${p.playback_limit}`);
    console.log(`  Now Playing: ${p.now_playing_content}`);
  }

  // 3. Get channels and try a few different ones
  console.log('\nTrying different channels...');
  const channelsUrl = `${TEST_PORTAL}/portal.php?type=itv&action=get_ordered_list&genre=*&p=0&JsHttpRequest=1-xml`;
  const channelsText = await rpiApi(channelsUrl, TEST_MAC, token);
  const channelsData = parseSecureJson(channelsText);
  const channels = channelsData?.js?.data || [];
  
  console.log(`Total channels: ${channels.length}`);
  
  // Try 3 different channels
  const testChannels = [
    channels.find(c => c.name?.includes('ESPN')),
    channels.find(c => c.name?.includes('CNN')),
    channels.find(c => c.name?.includes('FOX')),
    channels[0],
    channels[Math.floor(channels.length / 2)],
  ].filter(Boolean).slice(0, 3);

  for (const channel of testChannels) {
    console.log(`\nTrying: ${channel.name}`);
    
    const cmd = encodeURIComponent(channel.cmd);
    const createLinkUrl = `${TEST_PORTAL}/portal.php?type=itv&action=create_link&cmd=${cmd}&series=&forced_storage=undefined&disable_ad=0&download=0&JsHttpRequest=1-xml`;
    const linkText = await rpiApi(createLinkUrl, TEST_MAC, token);
    const linkData = parseSecureJson(linkText);
    
    let streamUrl = linkData?.js?.cmd;
    if (streamUrl) streamUrl = streamUrl.replace(/^ffmpeg\s+/, '').trim();
    
    if (!streamUrl) {
      console.log('  ❌ No stream URL');
      continue;
    }
    
    console.log(`  URL: ${streamUrl.substring(0, 60)}...`);
    
    // Try to stream
    const streamParams = new URLSearchParams({ url: streamUrl, mac: TEST_MAC, key: RPI_PROXY_KEY });
    const streamRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams}`, {
      signal: AbortSignal.timeout(10000),
    });
    
    console.log(`  Stream status: ${streamRes.status}`);
    console.log(`  Content-Type: ${streamRes.headers.get('content-type')}`);
    
    if (streamRes.ok && streamRes.headers.get('content-type')?.includes('video')) {
      console.log('  ✓ WORKS!');
      break;
    }
  }
}

test().catch(console.error);
