/**
 * Test script for DLHD Proxy API logic
 * 
 * This tests the same logic that the API uses
 */

const https = require('https');

const DLHD_CONFIG = {
  m3u8BaseUrl: 'https://zekonew.giokko.ru/zeko/premium',
  keyReferer: 'https://epicplayplay.cfd/',
  segmentReferer: 'https://zekonew.giokko.ru/',
};

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    https.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers,
      },
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        data: Buffer.concat(chunks),
      }));
    }).on('error', reject);
  });
}

async function testChannel(channelId) {
  console.log(`\nTesting DLHD Proxy API for channel ${channelId}`);
  console.log('='.repeat(60));

  // 1. Fetch M3U8
  console.log('\n1. Fetching M3U8...');
  const m3u8Url = `${DLHD_CONFIG.m3u8BaseUrl}${channelId}/mono.css`;
  const m3u8Response = await httpGet(m3u8Url, {
    'Referer': DLHD_CONFIG.segmentReferer,
  });

  if (m3u8Response.status !== 200) {
    console.log(`   ✗ Failed: HTTP ${m3u8Response.status}`);
    return;
  }

  const m3u8Content = m3u8Response.data.toString();
  console.log(`   ✓ M3U8 fetched (${m3u8Content.length} chars)`);

  // 2. Parse M3U8
  const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
  const ivMatch = m3u8Content.match(/IV=0x([a-fA-F0-9]+)/);
  const segments = m3u8Content.match(/https:\/\/whalesignal\.ai\/[^\s]+/g) || [];

  if (!keyMatch) {
    console.log('   ✗ No key URL found');
    return;
  }

  const keyUrl = keyMatch[1];
  const iv = ivMatch ? ivMatch[1] : null;

  console.log(`   Key URL: ${keyUrl}`);
  console.log(`   IV: 0x${iv}`);
  console.log(`   Segments: ${segments.length}`);

  // 3. Fetch key
  console.log('\n2. Fetching decryption key...');
  const keyResponse = await httpGet(keyUrl, {
    'Referer': DLHD_CONFIG.keyReferer,
    'Origin': 'https://epicplayplay.cfd',
  });

  if (keyResponse.status !== 200) {
    console.log(`   ✗ Failed: HTTP ${keyResponse.status}`);
    return;
  }

  if (keyResponse.data.length !== 16) {
    console.log(`   ✗ Invalid key length: ${keyResponse.data.length}`);
    return;
  }

  const keyHex = keyResponse.data.toString('hex');
  const keyBase64 = keyResponse.data.toString('base64');
  console.log(`   ✓ Key (hex): ${keyHex}`);
  console.log(`   ✓ Key (base64): ${keyBase64}`);

  // 4. Generate proxied M3U8
  console.log('\n3. Generating proxied M3U8...');
  
  const keyDataUri = `data:application/octet-stream;base64,${keyBase64}`;
  let proxiedM3U8 = m3u8Content.replace(/URI="[^"]+"/, `URI="${keyDataUri}"`);

  // Proxy segment URLs
  const lines = proxiedM3U8.split('\n');
  const rewritten = lines.map(line => {
    if (line.trim().startsWith('https://whalesignal.ai/')) {
      return `/api/dlhd-proxy?url=${encodeURIComponent(line.trim())}`;
    }
    return line;
  });
  proxiedM3U8 = rewritten.join('\n');

  console.log('   ✓ Proxied M3U8 generated');

  // 5. Output
  console.log('\n' + '='.repeat(60));
  console.log('API RESPONSE SIMULATION');
  console.log('='.repeat(60));

  console.log('\nInfo endpoint response:');
  console.log(JSON.stringify({
    channel: channelId,
    status: 'active',
    encryption: {
      method: 'AES-128-CBC',
      key: keyHex,
      keyBase64,
      iv,
    },
    urls: {
      proxied: {
        m3u8: `/api/dlhd-proxy?channel=${channelId}`,
        key: `/api/dlhd-proxy/key?channel=${channelId}`,
      },
    },
    stream: {
      segmentCount: segments.length,
    },
  }, null, 2));

  console.log('\nProxied M3U8 (first 20 lines):');
  console.log(proxiedM3U8.split('\n').slice(0, 20).join('\n'));

  console.log('\n' + '='.repeat(60));
  console.log('✓ API logic test passed!');
  console.log('='.repeat(60));
}

const channelId = process.argv[2] || 769;
testChannel(channelId).catch(console.error);
