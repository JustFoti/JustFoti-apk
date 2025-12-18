#!/usr/bin/env node
/**
 * Test all DLHD servers discovered from server_lookup
 */

const https = require('https');

// Servers discovered from server_lookup
const SERVERS = ['zeko', 'wind', 'nfs', 'ddy6', 'chevy', 'top1'];
const CHANNEL = 'premium51';

async function testServer(server) {
  // Try kiko2.ru domain first (seems to be the active one)
  const urls = [
    `https://${server}new.kiko2.ru/${server}/${CHANNEL}/mono.css`,
    `https://${server}new.giokko.ru/${server}/${CHANNEL}/mono.css`,
  ];
  
  // Special case for top1
  if (server === 'top1') {
    urls.unshift(`https://top1.kiko2.ru/top1/cdn/${CHANNEL}/mono.css`);
    urls.push(`https://top1.giokko.ru/top1/cdn/${CHANNEL}/mono.css`);
  }
  
  for (const url of urls) {
    const result = await testUrl(url);
    if (result.isM3U8) {
      return { server, url, ...result };
    }
  }
  
  // Return last result if none worked
  return { server, url: urls[0], status: 'FAILED', error: 'No working URL found' };
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
        resolve({
          status: res.statusCode,
          isM3U8,
          size: data.length,
          preview: isM3U8 ? '[Valid M3U8]' : data.substring(0, 80),
        });
      });
    });
    
    req.on('error', (err) => resolve({ status: 'ERROR', error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

async function main() {
  console.log('Testing all DLHD servers...\n');
  console.log('Channel:', CHANNEL);
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const server of SERVERS) {
    const result = await testServer(server);
    results.push(result);
    
    const icon = result.isM3U8 ? '✅' : '❌';
    console.log(`\n${icon} ${server}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${result.status}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    if (result.preview) console.log(`   Preview: ${result.preview}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\nWorking servers:');
  results.filter(r => r.isM3U8).forEach(r => console.log(`  - ${r.server}: ${r.url}`));
  
  console.log('\nFailed servers:');
  results.filter(r => !r.isM3U8).forEach(r => console.log(`  - ${r.server}: ${r.status}`));
}

main().catch(console.error);
