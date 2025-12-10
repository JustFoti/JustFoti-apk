#!/usr/bin/env node
/**
 * Test what headers IPTV portals actually require
 * Run: node scripts/test-iptv-headers.js <stream_url>
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const streamUrl = process.argv[2];

if (!streamUrl) {
  console.log('Usage: node scripts/test-iptv-headers.js <stream_url>');
  console.log('Example: node scripts/test-iptv-headers.js "http://line.stayconnected.pro:80/play/live.php?mac=00:1A:79:33:35:39&stream=172922&extension=ts&play_token=xxx"');
  process.exit(1);
}

const url = new URL(streamUrl);
const client = url.protocol === 'https:' ? https : http;

// Test different header combinations
const headerTests = [
  {
    name: 'No headers (like VLC)',
    headers: {}
  },
  {
    name: 'Just User-Agent',
    headers: {
      'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18'
    }
  },
  {
    name: 'Browser User-Agent',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  {
    name: 'STB Headers (full)',
    headers: {
      'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
      'X-User-Agent': 'Model: MAG250; Link: WiFi',
      'Accept': '*/*',
      'Referer': `${url.protocol}//${url.host}/`,
    }
  },
  {
    name: 'With Origin header',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://example.com',
      'Referer': 'https://example.com/'
    }
  }
];

async function testHeaders(name, headers) {
  return new Promise((resolve) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers,
      timeout: 10000,
    };

    const req = client.request(options, (res) => {
      let data = Buffer.alloc(0);
      
      res.on('data', (chunk) => {
        data = Buffer.concat([data, chunk]);
        // Only read first 1KB to check if stream works
        if (data.length > 1024) {
          req.destroy();
        }
      });

      res.on('end', () => {
        resolve({
          name,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          dataSize: data.length,
          success: res.statusCode === 200 && data.length > 0
        });
      });

      res.on('close', () => {
        resolve({
          name,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          dataSize: data.length,
          success: res.statusCode === 200 && data.length > 0
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name,
        status: 0,
        error: err.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        status: 0,
        error: 'Timeout',
        success: false
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log(`\nTesting stream URL: ${streamUrl.substring(0, 80)}...\n`);
  console.log('=' .repeat(60));

  for (const test of headerTests) {
    const result = await testHeaders(test.name, test.headers);
    
    const status = result.success ? '✓' : '✗';
    console.log(`\n${status} ${result.name}`);
    console.log(`  Status: ${result.status}`);
    if (result.contentType) console.log(`  Content-Type: ${result.contentType}`);
    if (result.dataSize) console.log(`  Data received: ${result.dataSize} bytes`);
    if (result.error) console.log(`  Error: ${result.error}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\nIf "No headers" works, the portal doesn\'t require special headers.');
  console.log('The browser issue is likely just CORS.\n');
}

runTests();
