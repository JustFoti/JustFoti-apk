#!/usr/bin/env node
/**
 * Find channels with working keys
 */

const https = require('https');

async function testKey(channel) {
  const keyUrl = `https://top2.giokko.ru/wmsxx.php?test=true&name=${channel}&number=5884443`;
  return new Promise((resolve) => {
    const url = new URL(keyUrl);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
      timeout: 10000
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ channel, status: res.statusCode }));
    });
    req.on('error', () => resolve({ channel, status: 'error' }));
    req.on('timeout', () => { req.destroy(); resolve({ channel, status: 'timeout' }); });
    req.end();
  });
}

async function main() {
  const working = [];
  const blocked = [];
  
  // Test channels 1-100
  console.log('Testing premium1-100...');
  
  for (let i = 1; i <= 100; i++) {
    const result = await testKey(`premium${i}`);
    if (result.status === 200) {
      working.push(i);
      process.stdout.write(`\r[${i}/100] Working: ${working.length}`);
    } else {
      blocked.push(i);
    }
  }
  
  console.log(`\n\nWorking channels (${working.length}): ${working.join(', ')}`);
  console.log(`\nBlocked channels (${blocked.length}): ${blocked.slice(0, 20).join(', ')}${blocked.length > 20 ? '...' : ''}`);
}

main().catch(console.error);
