#!/usr/bin/env node
/**
 * Test DLHD server lookup to find which server is assigned to channels
 */

const https = require('https');

const CHANNELS = ['premium51', 'premium325', 'premium1', 'premium100'];

// Server lookup endpoints from actual player page
const LOOKUP_URLS = [
  'https://chevy.giokko.ru/server_lookup',
  'https://zeko.giokko.ru/server_lookup',
  'https://chevy.kiko2.ru/server_lookup',
  'https://zeko.kiko2.ru/server_lookup',
];

async function testLookup(baseUrl, channel) {
  const url = `${baseUrl}?channel_id=${channel}`;
  
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
        try {
          const json = JSON.parse(data);
          resolve({ url, status: res.statusCode, serverKey: json.server_key, raw: data });
        } catch {
          resolve({ url, status: res.statusCode, error: 'Invalid JSON', raw: data.substring(0, 100) });
        }
      });
    });
    
    req.on('error', (err) => resolve({ url, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ url, error: 'TIMEOUT' }); });
  });
}

async function main() {
  console.log('Testing DLHD Server Lookup...\n');
  
  for (const baseUrl of LOOKUP_URLS) {
    console.log(`\n=== ${baseUrl} ===`);
    
    for (const channel of CHANNELS) {
      const result = await testLookup(baseUrl, channel);
      
      if (result.serverKey) {
        console.log(`  ${channel}: ${result.serverKey} ✅`);
      } else if (result.error) {
        console.log(`  ${channel}: ${result.error} ❌`);
      } else {
        console.log(`  ${channel}: ${result.status} - ${result.raw}`);
      }
    }
  }
  
  console.log('\n\nDone!');
}

main().catch(console.error);
