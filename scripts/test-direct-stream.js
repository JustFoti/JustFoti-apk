#!/usr/bin/env node
/**
 * Test: Can we get stream URL from RPi proxy and play directly?
 * 
 * Theory: 
 * - Stream tokens are bound to the IP that calls create_link
 * - If RPi proxy calls create_link, token is bound to RPi's residential IP
 * - Question: Can a different IP (client) then use that stream URL?
 * 
 * This tests whether IPTV providers validate the streaming IP matches the token IP.
 */

const RPI_PROXY_URL = process.env.RPI_PROXY_URL || 'https://rpi-proxy.vynx.cc';
const RPI_PROXY_KEY = process.env.RPI_PROXY_KEY || '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

// Test account - replace with a working one
const TEST_PORTAL = process.env.TEST_PORTAL || 'http://skunkytv.live/c';
const TEST_MAC = process.env.TEST_MAC || '00:1A:79:00:00:0C';

const STB_USER_AGENT = 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';

function normalizePortalUrl(portalUrl) {
  let url = portalUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  url = url.replace(/\/+$/, '');
  if (url.endsWith('/c')) url = url.slice(0, -2);
  return url;
}

function parseSecureJson(text) {
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function buildHeaders(mac, token) {
  const encodedMac = encodeURIComponent(mac);
  const headers = {
    'User-Agent': STB_USER_AGENT,
    'X-User-Agent': 'Model: MAG250; Link: WiFi',
    'Accept': '*/*',
    'Cookie': `mac=${encodedMac}; stb_lang=en; timezone=GMT`,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function testDirectStream() {
  console.log('='.repeat(60));
  console.log('Testing Direct Stream Playback Theory');
  console.log('='.repeat(60));
  console.log(`Portal: ${TEST_PORTAL}`);
  console.log(`MAC: ${TEST_MAC}`);
  console.log(`RPi Proxy: ${RPI_PROXY_URL}`);
  console.log('');

  const portalUrl = normalizePortalUrl(TEST_PORTAL);

  try {
    // Step 1: Handshake (from this machine - datacenter IP)
    console.log('Step 1: Handshake from datacenter IP...');
    const handshakeUrl = new URL('/portal.php', portalUrl);
    handshakeUrl.searchParams.set('type', 'stb');
    handshakeUrl.searchParams.set('action', 'handshake');
    handshakeUrl.searchParams.set('token', '');
    handshakeUrl.searchParams.set('JsHttpRequest', '1-xml');

    const handshakeRes = await fetch(handshakeUrl.toString(), {
      headers: buildHeaders(TEST_MAC),
    });
    const handshakeText = await handshakeRes.text();
    const handshakeData = parseSecureJson(handshakeText);
    
    if (!handshakeData?.js?.token) {
      console.log('❌ Handshake failed - no token');
      console.log('Response:', handshakeText.substring(0, 200));
      return;
    }
    
    const token = handshakeData.js.token;
    console.log(`✓ Got token: ${token.substring(0, 20)}...`);

    // Step 2: Get channels (from this machine)
    console.log('\nStep 2: Get channels...');
    const channelsUrl = new URL('/portal.php', portalUrl);
    channelsUrl.searchParams.set('type', 'itv');
    channelsUrl.searchParams.set('action', 'get_ordered_list');
    channelsUrl.searchParams.set('genre', '*');
    channelsUrl.searchParams.set('p', '0');
    channelsUrl.searchParams.set('JsHttpRequest', '1-xml');

    const channelsRes = await fetch(channelsUrl.toString(), {
      headers: buildHeaders(TEST_MAC, token),
    });
    const channelsText = await channelsRes.text();
    const channelsData = parseSecureJson(channelsText);
    
    if (!channelsData?.js?.data?.length) {
      console.log('❌ No channels found');
      return;
    }
    
    const channel = channelsData.js.data[0];
    console.log(`✓ Found ${channelsData.js.total_items} channels`);
    console.log(`  Using: ${channel.name} (cmd: ${channel.cmd?.substring(0, 50)}...)`);

    // Step 3a: Get stream URL from DATACENTER IP (this machine)
    console.log('\n' + '='.repeat(60));
    console.log('TEST A: create_link from DATACENTER IP');
    console.log('='.repeat(60));
    
    const createLinkUrl = new URL('/portal.php', portalUrl);
    createLinkUrl.searchParams.set('type', 'itv');
    createLinkUrl.searchParams.set('action', 'create_link');
    createLinkUrl.searchParams.set('cmd', channel.cmd);
    createLinkUrl.searchParams.set('series', '');
    createLinkUrl.searchParams.set('forced_storage', 'undefined');
    createLinkUrl.searchParams.set('disable_ad', '0');
    createLinkUrl.searchParams.set('download', '0');
    createLinkUrl.searchParams.set('JsHttpRequest', '1-xml');

    const datacenterLinkRes = await fetch(createLinkUrl.toString(), {
      headers: buildHeaders(TEST_MAC, token),
    });
    const datacenterLinkText = await datacenterLinkRes.text();
    const datacenterLinkData = parseSecureJson(datacenterLinkText);
    
    let datacenterStreamUrl = datacenterLinkData?.js?.cmd || null;
    if (datacenterStreamUrl) {
      datacenterStreamUrl = datacenterStreamUrl.replace(/^ffmpeg\s+/, '').trim();
    }
    
    console.log(`Stream URL from datacenter: ${datacenterStreamUrl?.substring(0, 80)}...`);
    
    // Try to fetch stream from datacenter
    if (datacenterStreamUrl) {
      console.log('\nTrying to fetch stream from datacenter IP...');
      try {
        const streamRes = await fetch(datacenterStreamUrl, {
          headers: buildHeaders(TEST_MAC),
          signal: AbortSignal.timeout(10000),
        });
        console.log(`  Status: ${streamRes.status}`);
        console.log(`  Content-Type: ${streamRes.headers.get('content-type')}`);
        
        if (streamRes.ok) {
          const chunk = await streamRes.arrayBuffer().then(b => b.slice(0, 1000));
          console.log(`  ✓ Got ${chunk.byteLength} bytes - STREAM WORKS FROM DATACENTER!`);
        } else {
          console.log(`  ❌ Stream blocked (${streamRes.status})`);
        }
      } catch (e) {
        console.log(`  ❌ Stream error: ${e.message}`);
      }
    }


    // Step 3b: Get stream URL from RPi PROXY (residential IP)
    console.log('\n' + '='.repeat(60));
    console.log('TEST B: create_link from RPi PROXY (residential IP)');
    console.log('='.repeat(60));
    
    const rpiParams = new URLSearchParams({
      url: createLinkUrl.toString(),
      mac: TEST_MAC,
      token: token,
      key: RPI_PROXY_KEY,
    });
    
    const rpiLinkRes = await fetch(`${RPI_PROXY_URL}/iptv/api?${rpiParams.toString()}`);
    const rpiLinkText = await rpiLinkRes.text();
    
    console.log(`RPi proxy response status: ${rpiLinkRes.status}`);
    
    let rpiLinkData;
    try {
      rpiLinkData = parseSecureJson(rpiLinkText) || JSON.parse(rpiLinkText);
    } catch {
      console.log('Raw response:', rpiLinkText.substring(0, 200));
      return;
    }
    
    let rpiStreamUrl = rpiLinkData?.js?.cmd || null;
    if (rpiStreamUrl) {
      rpiStreamUrl = rpiStreamUrl.replace(/^ffmpeg\s+/, '').trim();
    }
    
    console.log(`Stream URL from RPi: ${rpiStreamUrl?.substring(0, 80)}...`);
    
    // Compare URLs
    console.log('\n' + '-'.repeat(60));
    console.log('URL Comparison:');
    console.log(`  Datacenter URL: ${datacenterStreamUrl?.substring(0, 100)}`);
    console.log(`  RPi Proxy URL:  ${rpiStreamUrl?.substring(0, 100)}`);
    console.log(`  URLs match: ${datacenterStreamUrl === rpiStreamUrl}`);
    
    // Try to fetch RPi-obtained stream from DATACENTER (this machine)
    if (rpiStreamUrl) {
      console.log('\n' + '='.repeat(60));
      console.log('TEST C: Fetch RPi-obtained URL from DATACENTER IP');
      console.log('(This tests if token is IP-bound)');
      console.log('='.repeat(60));
      
      try {
        const streamRes = await fetch(rpiStreamUrl, {
          headers: buildHeaders(TEST_MAC),
          signal: AbortSignal.timeout(10000),
        });
        console.log(`  Status: ${streamRes.status}`);
        console.log(`  Content-Type: ${streamRes.headers.get('content-type')}`);
        
        if (streamRes.ok) {
          const chunk = await streamRes.arrayBuffer().then(b => b.slice(0, 1000));
          console.log(`  ✓ Got ${chunk.byteLength} bytes`);
          console.log('\n🎉 SUCCESS! Stream URL from RPi works from datacenter!');
          console.log('This means: Token is NOT IP-bound, client can play directly!');
        } else {
          const body = await streamRes.text();
          console.log(`  ❌ Stream blocked (${streamRes.status})`);
          console.log(`  Body: ${body.substring(0, 200)}`);
          console.log('\n❌ FAILED: Token appears to be IP-bound');
          console.log('Client must stream through RPi proxy');
        }
      } catch (e) {
        console.log(`  ❌ Stream error: ${e.message}`);
        console.log('\n❌ FAILED: Cannot access stream from datacenter');
      }
    }

    // Step 4: Test streaming through RPi proxy (control test)
    console.log('\n' + '='.repeat(60));
    console.log('TEST D: Stream through RPi proxy (control test)');
    console.log('='.repeat(60));
    
    if (rpiStreamUrl) {
      const streamParams = new URLSearchParams({
        url: rpiStreamUrl,
        mac: TEST_MAC,
        key: RPI_PROXY_KEY,
      });
      
      try {
        const proxyStreamRes = await fetch(`${RPI_PROXY_URL}/iptv/stream?${streamParams.toString()}`, {
          signal: AbortSignal.timeout(10000),
        });
        console.log(`  Status: ${proxyStreamRes.status}`);
        console.log(`  Content-Type: ${proxyStreamRes.headers.get('content-type')}`);
        
        if (proxyStreamRes.ok) {
          const chunk = await proxyStreamRes.arrayBuffer().then(b => b.slice(0, 1000));
          console.log(`  ✓ Got ${chunk.byteLength} bytes through proxy`);
          console.log('  RPi proxy streaming works (as expected)');
        } else {
          console.log(`  ❌ Proxy stream failed (${proxyStreamRes.status})`);
        }
      } catch (e) {
        console.log(`  ❌ Proxy stream error: ${e.message}`);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDirectStream();
