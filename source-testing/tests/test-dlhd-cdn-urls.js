#!/usr/bin/env node
/**
 * Test DLHD CDN URLs to verify which domains are working
 * 
 * Based on actual player page (dlhd-player-page.html):
 *   - Server lookup: https://chevy.giokko.ru/server_lookup?channel_id=premium51
 *   - M3U8 for top1/cdn: https://top1.kiko2.ru/top1/cdn/premium51/mono.css
 *   - M3U8 for others: https://${sk}new.kiko2.ru/${sk}/premium51/mono.css
 */

const https = require('https');

const CHANNEL = 'premium51';

// Test URLs based on actual player page
const TEST_URLS = [
  // kiko2.ru domain (current active CDN)
  { name: 'zeko (kiko2)', url: `https://zekonew.kiko2.ru/zeko/${CHANNEL}/mono.css` },
  { name: 'chevy (kiko2)', url: `https://chevynew.kiko2.ru/chevy/${CHANNEL}/mono.css` },
  { name: 'top1/cdn (kiko2)', url: `https://top1.kiko2.ru/top1/cdn/${CHANNEL}/mono.css` },
  
  // giokko.ru domain (legacy - may not work)
  { name: 'zeko (giokko)', url: `https://zekonew.giokko.ru/zeko/${CHANNEL}/mono.css` },
  { name: 'chevy (giokko)', url: `https://chevynew.giokko.ru/chevy/${CHANNEL}/mono.css` },
  { name: 'top1/cdn (giokko)', url: `https://top1.giokko.ru/top1/cdn/${CHANNEL}/mono.css` },
];

async function testUrl(name, url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
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
        const elapsed = Date.now() - startTime;
        const isM3U8 = data.includes('#EXTM3U') || data.includes('#EXT-X-');
        const preview = data.substring(0, 100).replace(/\n/g, '\\n');
        
        resolve({
          name,
          url,
          status: res.statusCode,
          elapsed: `${elapsed}ms`,
          isM3U8,
          size: data.length,
          preview: isM3U8 ? '[Valid M3U8]' : preview,
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        name,
        url,
        status: 'ERROR',
        error: err.message,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        url,
        status: 'TIMEOUT',
      });
    });
  });
}

async function main() {
  console.log('Testing DLHD CDN URLs...\n');
  console.log('Channel:', CHANNEL);
  console.log('='.repeat(80));
  
  for (const { name, url } of TEST_URLS) {
    const result = await testUrl(name, url);
    
    const statusIcon = result.isM3U8 ? '✅' : (result.status === 200 ? '⚠️' : '❌');
    console.log(`\n${statusIcon} ${result.name}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${result.status} (${result.elapsed || 'N/A'})`);
    if (result.error) console.log(`   Error: ${result.error}`);
    if (result.preview) console.log(`   Preview: ${result.preview}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Done!');
}

main().catch(console.error);
