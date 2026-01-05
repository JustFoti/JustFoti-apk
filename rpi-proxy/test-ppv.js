#!/usr/bin/env node
/**
 * Test PPV stream fetch directly from RPI
 */

const https = require('https');

const testUrl = 'https://gg.poocloud.in/familyguy/index.m3u8';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://modistreams.org/',
  'Origin': 'https://modistreams.org',
  'Connection': 'keep-alive',
};

console.log('Testing PPV stream fetch...');
console.log('URL:', testUrl);
console.log('Headers:', JSON.stringify(headers, null, 2));

const url = new URL(testUrl);

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'GET',
  headers,
};

const req = https.request(options, (res) => {
  console.log('\nResponse Status:', res.statusCode);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\nResponse Body (first 500 chars):');
    console.log(data.substring(0, 500));
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
