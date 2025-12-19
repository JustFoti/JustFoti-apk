#!/usr/bin/env node
/**
 * Test the Cloudflare-only DLHD proxy flow for multiple channels
 * Tests: session fetch, heartbeat, key fetch - all without RPI proxy
 */

const CHANNELS_TO_TEST = process.argv.slice(2).length > 0 
  ? process.argv.slice(2) 
  : ['51', '325', '313', '1', '100'];

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const PARENT_DOMAIN = 'daddyhd.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DADDYHD_PATH_VARIANTS = ['stream', 'cast', 'watch', 'plus', 'casting', 'player'];
const ALL_SERVER_KEYS = ['zeko', 'wind', 'nfs', 'ddy6', 'chevy', 'top1/cdn'];
const CDN_DOMAINS = ['kiko2.ru', 'giokko.ru'];

function generateClientToken(channelKey, country, timestamp, userAgent) {
  const screen = '1920x1080';
  const tz = 'America/New_York';
  const lang = 'en-US';
  const fingerprint = `${userAgent}|${screen}|${tz}|${lang}`;
  const signData = `${channelKey}|${country}|${timestamp}|${userAgent}|${fingerprint}`;
  return Buffer.from(signData).toString('base64');
}

async function getSession(channel) {
  const refererPaths = [
    `https://${PARENT_DOMAIN}/watch.php?id=${channel}`,
    ...DADDYHD_PATH_VARIANTS.map(path => `https://${PARENT_DOMAIN}/${path}/stream-${channel}.php`)
  ];

  for (const referer of refererPaths) {
    try {
      const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channel}`;
      const response = await fetch(playerUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': referer,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Extract auth variables - the xx.html redirect is client-side JS, we can ignore it
      const tokenMatch = html.match(/AUTH_TOKEN\s*=\s*["']([^"']+)["']/);
      const channelKeyMatch = html.match(/CHANNEL_KEY\s*=\s*["']([^"']+)["']/);
      const countryMatch = html.match(/AUTH_COUNTRY\s*=\s*["']([^"']+)["']/);
      const tsMatch = html.match(/AUTH_TS\s*=\s*["']([^"']+)["']/);

      if (!tokenMatch) continue;

      return {
        token: tokenMatch[1],
        channelKey: channelKeyMatch?.[1] || `premium${channel}`,
        country: countryMatch?.[1] || 'US',
        timestamp: tsMatch?.[1] || String(Math.floor(Date.now() / 1000)),
        referer,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function callHeartbeat(session) {
  const clientToken = generateClientToken(
    session.channelKey,
    session.country,
    session.timestamp,
    USER_AGENT
  );

  try {
    const response = await fetch('https://chevy.kiko2.ru/heartbeat', {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
        'Authorization': `Bearer ${session.token}`,
        'X-Channel-Key': session.channelKey,
        'X-Client-Token': clientToken,
      },
    });

    const text = await response.text();
    const success = response.ok && (
      text.includes('Session created') ||
      text.includes('Session extended') ||
      text.includes('"status":"ok"')
    );

    return { success, status: response.status, response: text.substring(0, 100) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getServerKey(channelKey) {
  try {
    const response = await fetch(
      `https://chevy.giokko.ru/server_lookup?channel_id=${channelKey}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': `https://${PLAYER_DOMAIN}/`,
        },
      }
    );

    if (response.ok) {
      const text = await response.text();
      if (!text.startsWith('<')) {
        const data = JSON.parse(text);
        if (data.server_key) return data.server_key;
      }
    }
  } catch {}
  return 'zeko';
}

async function fetchM3U8(serverKey, channelKey, domain) {
  const url = serverKey === 'top1/cdn'
    ? `https://top1.${domain}/top1/cdn/${channelKey}/mono.css`
    : `https://${serverKey}new.${domain}/${serverKey}/${channelKey}/mono.css`;

  try {
    const response = await fetch(`${url}?_t=${Date.now()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': `https://${PLAYER_DOMAIN}/`,
      },
    });

    const content = await response.text();
    const isValid = content.includes('#EXTM3U') || content.includes('#EXT-X-');
    
    // Extract key URL from M3U8
    const keyMatch = content.match(/URI="([^"]+)"/);
    
    return {
      success: isValid,
      url,
      status: response.status,
      keyUrl: keyMatch?.[1],
      contentLength: content.length,
    };
  } catch (error) {
    return { success: false, url, error: error.message };
  }
}

async function fetchKey(keyUrl, session) {
  const clientToken = generateClientToken(
    session.channelKey,
    session.country,
    session.timestamp,
    USER_AGENT
  );

  // Rewrite key URL to use chevy.kiko2.ru
  const keyPathMatch = keyUrl.match(/\/key\/premium\d+\/\d+/);
  const finalKeyUrl = keyPathMatch 
    ? `https://chevy.kiko2.ru${keyPathMatch[0]}`
    : keyUrl;

  try {
    const response = await fetch(finalKeyUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': '*/*',
        'Origin': `https://${PLAYER_DOMAIN}`,
        'Referer': `https://${PLAYER_DOMAIN}/`,
        'Authorization': `Bearer ${session.token}`,
        'X-Channel-Key': session.channelKey,
        'X-Client-Token': clientToken,
      },
    });

    const data = await response.arrayBuffer();
    const text = new TextDecoder().decode(data);

    if (text.includes('"E2"') || text.includes('Session must be created')) {
      return { success: false, error: 'E2: Session not established', size: data.byteLength };
    }
    if (text.includes('"E3"') || text.includes('Token expired')) {
      return { success: false, error: 'E3: Token expired', size: data.byteLength };
    }

    const isValidKey = data.byteLength === 16 && !text.startsWith('{') && !text.startsWith('[');
    
    return {
      success: isValidKey,
      size: data.byteLength,
      url: finalKeyUrl,
      preview: isValidKey ? '(16-byte AES key)' : text.substring(0, 50),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testChannel(channel) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TESTING CHANNEL ${channel}`);
  console.log('='.repeat(60));

  // Step 1: Get session
  console.log('\n1. Fetching session...');
  const session = await getSession(channel);
  
  if (!session) {
    console.log('   ❌ Failed to get session');
    return { channel, success: false, error: 'Session fetch failed' };
  }
  
  console.log(`   ✅ Session obtained`);
  console.log(`      Token: ${session.token.substring(0, 30)}...`);
  console.log(`      Channel Key: ${session.channelKey}`);
  console.log(`      Country: ${session.country}`);
  console.log(`      Referer: ${session.referer}`);

  // Step 2: Get server key
  console.log('\n2. Looking up server...');
  const serverKey = await getServerKey(session.channelKey);
  console.log(`   Server key: ${serverKey}`);

  // Step 3: Fetch M3U8
  console.log('\n3. Fetching M3U8...');
  let m3u8Result = null;
  
  for (const domain of CDN_DOMAINS) {
    m3u8Result = await fetchM3U8(serverKey, session.channelKey, domain);
    if (m3u8Result.success) {
      console.log(`   ✅ M3U8 found at ${serverKey}@${domain}`);
      console.log(`      URL: ${m3u8Result.url}`);
      console.log(`      Key URL: ${m3u8Result.keyUrl?.substring(0, 60) || 'none'}...`);
      break;
    }
  }

  if (!m3u8Result?.success) {
    // Try other servers
    for (const sk of ALL_SERVER_KEYS.filter(k => k !== serverKey)) {
      for (const domain of CDN_DOMAINS) {
        m3u8Result = await fetchM3U8(sk, session.channelKey, domain);
        if (m3u8Result.success) {
          console.log(`   ✅ M3U8 found at ${sk}@${domain} (fallback)`);
          break;
        }
      }
      if (m3u8Result?.success) break;
    }
  }

  if (!m3u8Result?.success) {
    console.log('   ❌ Failed to fetch M3U8 from any server');
    return { channel, success: false, error: 'M3U8 fetch failed' };
  }

  // Step 4: Call heartbeat
  console.log('\n4. Calling heartbeat...');
  const heartbeatResult = await callHeartbeat(session);
  
  if (heartbeatResult.success) {
    console.log(`   ✅ Heartbeat success: ${heartbeatResult.response}`);
  } else {
    console.log(`   ⚠️ Heartbeat failed: ${heartbeatResult.error || heartbeatResult.response}`);
    console.log('      (Continuing anyway - key fetch might still work)');
  }

  // Step 5: Fetch key
  if (m3u8Result.keyUrl) {
    console.log('\n5. Fetching encryption key...');
    const keyResult = await fetchKey(m3u8Result.keyUrl, session);
    
    if (keyResult.success) {
      console.log(`   ✅ Key fetched successfully!`);
      console.log(`      Size: ${keyResult.size} bytes`);
      console.log(`      URL: ${keyResult.url}`);
      return { channel, success: true, serverKey, keySize: keyResult.size };
    } else {
      console.log(`   ❌ Key fetch failed: ${keyResult.error}`);
      console.log(`      Size: ${keyResult.size}, Preview: ${keyResult.preview}`);
      return { channel, success: false, error: keyResult.error };
    }
  } else {
    console.log('\n5. No key URL in M3U8 (might be unencrypted)');
    return { channel, success: true, serverKey, note: 'No encryption key needed' };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('CLOUDFLARE-ONLY DLHD PROXY TEST');
  console.log('Testing direct auth without RPI proxy');
  console.log('='.repeat(60));
  console.log(`\nChannels to test: ${CHANNELS_TO_TEST.join(', ')}`);

  const results = [];

  for (const channel of CHANNELS_TO_TEST) {
    const result = await testChannel(channel);
    results.push(result);
    
    // Small delay between channels
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    console.log(`   Channel ${r.channel}: ${r.serverKey || 'OK'}${r.note ? ` (${r.note})` : ''}`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   Channel ${r.channel}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(console.error);
