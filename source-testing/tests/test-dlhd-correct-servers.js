#!/usr/bin/env node
/**
 * Test DLHD servers with their CORRECT assigned channels
 * Based on server_lookup results:
 *   - premium51: zeko
 *   - premium325: wind
 *   - premium1: nfs
 *   - premium100: ddy6
 */

const https = require('https');

// Server -> Channel mappings from server_lookup
const SERVER_CHANNEL_MAP = [
  { server: 'zeko', channel: 'premium51' },
  { server: 'wind', channel: 'premium325' },
  { server: 'nfs', channel: 'premium1' },
  { server: 'ddy6', channel: 'premium100' },
];

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
        resolve({
          status: res.statusCode,
          isM3U8,
          size: data.length,
          preview: isM3U8 ? '[Valid M3U8]' : data.substring(0, 100),
        });
      });
    });
    
    req.on('error', (err) => resolve({ status: 'ERROR', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

async function main() {
  console.log('Testing DLHD servers with their assigned channels...\n');
  console.log('='.repeat(80));
  
  for (const { server, channel } of SERVER_CHANNEL_MAP) {
    // Try both domains
    const urls = [
      `https://${server}new.kiko2.ru/${server}/${channel}/mono.css`,
      `https://${server}new.giokko.ru/${server}/${channel}/mono.css`,
    ];
    
    console.log(`\n${server} -> ${channel}:`);
    
    for (const url of urls) {
      const result = await testUrl(url);
      const icon = result.isM3U8 ? '✅' : '❌';
      console.log(`  ${icon} ${url}`);
      console.log(`     Status: ${result.status}, Size: ${result.size || 'N/A'}`);
      if (!result.isM3U8 && result.preview) {
        console.log(`     Preview: ${result.preview.substring(0, 60)}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
