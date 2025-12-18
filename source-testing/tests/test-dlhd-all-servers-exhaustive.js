#!/usr/bin/env node
/**
 * Test that simulates the new exhaustive server search logic
 * Tests multiple channels against ALL servers to verify the fallback works
 */

const https = require('https');

// ALL known server keys (same as in dlhd-proxy.ts)
const ALL_SERVER_KEYS = ['zeko', 'wind', 'nfs', 'ddy6', 'chevy', 'top1/cdn'];

// Test channels
const TEST_CHANNELS = ['51', '325', '1', '100', '200'];

function constructM3U8Url(serverKey, channelKey) {
  if (serverKey === 'top1/cdn') {
    return `https://top1.kiko2.ru/top1/cdn/${channelKey}/mono.css`;
  }
  return `https://${serverKey}new.kiko2.ru/${serverKey}/${channelKey}/mono.css`;
}

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://epicplayplay.cfd/',
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const isM3U8 = data.includes('#EXTM3U') || data.includes('#EXT-X-');
        resolve({ status: res.statusCode, isM3U8, size: data.length });
      });
    });
    
    req.on('error', (err) => resolve({ status: 'ERROR', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

async function findWorkingServer(channel) {
  const channelKey = `premium${channel}`;
  const triedServers = [];
  
  for (const serverKey of ALL_SERVER_KEYS) {
    triedServers.push(serverKey);
    const url = constructM3U8Url(serverKey, channelKey);
    const result = await testUrl(url);
    
    if (result.isM3U8) {
      return { channel, serverKey, triedCount: triedServers.length, triedServers };
    }
  }
  
  return { channel, serverKey: null, triedCount: triedServers.length, triedServers, failed: true };
}

async function main() {
  console.log('Testing exhaustive server search for multiple channels...\n');
  console.log('Servers to try:', ALL_SERVER_KEYS.join(', '));
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const channel of TEST_CHANNELS) {
    console.log(`\nChannel ${channel}:`);
    const result = await findWorkingServer(channel);
    results.push(result);
    
    if (result.serverKey) {
      console.log(`  ✅ Found working server: ${result.serverKey} (tried ${result.triedCount} servers)`);
      console.log(`     Tried: ${result.triedServers.join(' → ')}`);
    } else {
      console.log(`  ❌ No working server found (tried all ${result.triedCount} servers)`);
      console.log(`     Tried: ${result.triedServers.join(' → ')}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\nSummary:');
  const working = results.filter(r => r.serverKey);
  const failed = results.filter(r => !r.serverKey);
  console.log(`  Working: ${working.length}/${results.length}`);
  console.log(`  Failed: ${failed.length}/${results.length}`);
  
  if (working.length > 0) {
    console.log('\nWorking channels:');
    working.forEach(r => console.log(`  - Channel ${r.channel}: ${r.serverKey}`));
  }
  
  if (failed.length > 0) {
    console.log('\nFailed channels (may be offline):');
    failed.forEach(r => console.log(`  - Channel ${r.channel}`));
  }
}

main().catch(console.error);
