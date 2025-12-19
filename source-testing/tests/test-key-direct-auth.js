/**
 * Test key fetch with proper auth - simulating what CF worker should do
 */

const PLAYER_DOMAIN = 'epicplayplay.cfd';
const PARENT_DOMAIN = 'daddyhd.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function generateClientToken(channelKey, country, timestamp, userAgent) {
  const screen = '1920x1080';
  const tz = 'America/New_York';
  const lang = 'en-US';
  const fingerprint = `${userAgent}|${screen}|${tz}|${lang}`;
  const signData = `${channelKey}|${country}|${timestamp}|${userAgent}|${fingerprint}`;
  return Buffer.from(signData).toString('base64');
}

async function test() {
  const channel = '51';
  console.log('=== Testing Key Fetch with Auth ===\n');
  
  // Step 1: Get session
  console.log('1. Fetching session from player page...');
  const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channel}`;
  const referer = `https://${PARENT_DOMAIN}/watch.php?id=${channel}`;
  
  const playerRes = await fetch(playerUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': referer,
      'Accept': 'text/html,application/xhtml+xml',
    }
  });
  
  const html = await playerRes.text();
  
  const tokenMatch = html.match(/AUTH_TOKEN\s*=\s*["']([^"']+)["']/);
  const channelKeyMatch = html.match(/CHANNEL_KEY\s*=\s*["']([^"']+)["']/);
  const countryMatch = html.match(/AUTH_COUNTRY\s*=\s*["']([^"']+)["']/);
  const tsMatch = html.match(/AUTH_TS\s*=\s*["']([^"']+)["']/);
  
  if (!tokenMatch) {
    console.log('   ❌ No AUTH_TOKEN found');
    console.log('   HTML preview:', html.substring(0, 500));
    return;
  }
  
  const session = {
    token: tokenMatch[1],
    channelKey: channelKeyMatch?.[1] || `premium${channel}`,
    country: countryMatch?.[1] || 'US',
    timestamp: tsMatch?.[1] || String(Math.floor(Date.now() / 1000)),
  };
  
  console.log('   ✅ Session obtained');
  console.log('   Token:', session.token.substring(0, 30) + '...');
  console.log('   Channel Key:', session.channelKey);
  
  // Step 2: Call heartbeat
  console.log('\n2. Calling heartbeat...');
  const clientToken = generateClientToken(session.channelKey, session.country, session.timestamp, USER_AGENT);
  
  const heartbeatRes = await fetch('https://chevy.kiko2.ru/heartbeat', {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
      'Authorization': `Bearer ${session.token}`,
      'X-Channel-Key': session.channelKey,
      'X-Client-Token': clientToken,
    }
  });
  
  const heartbeatText = await heartbeatRes.text();
  console.log('   Status:', heartbeatRes.status);
  console.log('   Response:', heartbeatText.substring(0, 100));
  
  // Step 3: Fetch key
  console.log('\n3. Fetching encryption key...');
  const keyUrl = 'https://chevy.kiko2.ru/key/premium51/5887280';
  
  const keyRes = await fetch(keyUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Origin': `https://${PLAYER_DOMAIN}`,
      'Referer': `https://${PLAYER_DOMAIN}/`,
      'Authorization': `Bearer ${session.token}`,
      'X-Channel-Key': session.channelKey,
      'X-Client-Token': clientToken,
    }
  });
  
  console.log('   Status:', keyRes.status);
  console.log('   Headers:');
  for (const [k, v] of keyRes.headers.entries()) {
    console.log(`     ${k}: ${v}`);
  }
  
  const keyData = await keyRes.arrayBuffer();
  const keyText = new TextDecoder().decode(keyData);
  console.log('   Size:', keyData.byteLength, 'bytes');
  
  if (keyData.byteLength === 16) {
    console.log('   ✅ Valid 16-byte key!');
    console.log('   Key (hex):', Buffer.from(keyData).toString('hex'));
  } else {
    console.log('   Response:', keyText.substring(0, 500));
  }
}

test().catch(console.error);
