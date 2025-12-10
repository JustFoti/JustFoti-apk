#!/usr/bin/env node
/**
 * Test if key server responses rotate/change over time
 */

const https = require('https');

const CHANNELS = ['premium51', 'premium1', 'premium303', 'premium769', 'premium302'];

async function testKey(channel) {
  const keyUrl = `https://top2.giokko.ru/wmsxx.php?test=true&name=${channel}&number=5884443`;
  return new Promise((resolve) => {
    const url = new URL(keyUrl);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ channel, status: res.statusCode, size: Buffer.concat(chunks).length }));
    });
    req.on('error', () => resolve({ channel, status: 'error' }));
    req.end();
  });
}

async function runTest(iteration) {
  const results = await Promise.all(CHANNELS.map(testKey));
  const summary = results.map(r => `${r.channel.replace('premium', 'p')}:${r.status}`).join(' | ');
  console.log(`[${iteration}] ${summary}`);
  return results;
}

async function main() {
  console.log('Testing key server response patterns over 5 iterations (2s apart)\n');
  console.log('Legend: 200 = key returned, 418 = blocked\n');
  
  for (let i = 1; i <= 5; i++) {
    await runTest(i);
    if (i < 5) await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\nIf results vary between iterations, blocking is time/rate based.');
  console.log('If results are consistent, blocking is channel-specific.');
}

main().catch(console.error);
