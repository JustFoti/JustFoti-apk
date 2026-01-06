/**
 * Test Oxylabs ISP Proxy for PPV.to streams
 * 
 * Usage: node scripts/test-oxylabs-ppv.js
 * 
 * Set your Oxylabs credentials below or via env vars:
 *   OXYLABS_USERNAME, OXYLABS_PASSWORD
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ============================================
// CONFIGURE YOUR OXYLABS CREDENTIALS HERE
// ============================================
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME || 'YOUR_USERNAME';
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD || 'YOUR_PASSWORD';

// Oxylabs ISP proxy endpoint (residential IPs)
// Format: pr.oxylabs.io:7777 for residential
// Or use country-specific: us-pr.oxylabs.io:7777
const PROXY_HOST = 'pr.oxylabs.io';
const PROXY_PORT = 7777;

// Test URLs
const TEST_URLS = [
  {
    name: 'poocloud.in m3u8 (main playlist)',
    url: 'https://gg.poocloud.in/familyguy/index.m3u8',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://modistreams.org/',
      'Origin': 'https://modistreams.org',
      'Accept': '*/*',
    }
  },
  {
    name: 'modistreams.org (embed page)',
    url: 'https://modistreams.org/',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  },
  {
    name: 'vidsaver.io (segment host - should work without proxy)',
    url: 'https://vidsaver.io/',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  }
];

/**
 * Make HTTPS request through Oxylabs proxy using CONNECT tunnel
 */
function fetchViaProxy(targetUrl, headers) {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl);
    const auth = Buffer.from(`${OXYLABS_USERNAME}:${OXYLABS_PASSWORD}`).toString('base64');
    
    // Step 1: Connect to proxy and establish tunnel
    const proxyReq = http.request({
      host: PROXY_HOST,
      port: PROXY_PORT,
      method: 'CONNECT',
      path: `${target.hostname}:443`,
      headers: {
        'Proxy-Authorization': `Basic ${auth}`,
        'Host': `${target.hostname}:443`,
      },
    });

    proxyReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }

      // Step 2: Make HTTPS request through the tunnel
      const tlsOptions = {
        socket: socket,
        servername: target.hostname,
      };

      const tls = require('tls');
      const tlsSocket = tls.connect(tlsOptions, () => {
        const requestPath = target.pathname + target.search;
        const httpRequest = [
          `GET ${requestPath || '/'} HTTP/1.1`,
          `Host: ${target.hostname}`,
          ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
          'Connection: close',
          '',
          '',
        ].join('\r\n');

        tlsSocket.write(httpRequest);
      });

      let responseData = '';
      tlsSocket.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      tlsSocket.on('end', () => {
        // Parse HTTP response
        const headerEnd = responseData.indexOf('\r\n\r\n');
        const headerPart = responseData.substring(0, headerEnd);
        const body = responseData.substring(headerEnd + 4);
        
        const statusMatch = headerPart.match(/HTTP\/\d\.\d (\d+)/);
        const status = statusMatch ? parseInt(statusMatch[1]) : 0;

        resolve({
          status,
          headers: headerPart,
          body: body,
          size: body.length,
        });
      });

      tlsSocket.on('error', reject);
    });

    proxyReq.on('error', reject);
    proxyReq.end();
  });
}

/**
 * Direct fetch without proxy (for comparison)
 */
function fetchDirect(targetUrl, headers) {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl);
    
    const req = https.request({
      hostname: target.hostname,
      port: 443,
      path: target.pathname + target.search,
      method: 'GET',
      headers: {
        ...headers,
        'Host': target.hostname,
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body,
          size: body.length,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Oxylabs ISP Proxy Test for PPV.to');
  console.log('='.repeat(60));
  console.log(`Proxy: ${PROXY_HOST}:${PROXY_PORT}`);
  console.log(`Username: ${OXYLABS_USERNAME.substring(0, 5)}...`);
  console.log('');

  if (OXYLABS_USERNAME === 'YOUR_USERNAME') {
    console.log('⚠️  Please set your Oxylabs credentials!');
    console.log('   Edit this file or set env vars:');
    console.log('   OXYLABS_USERNAME=xxx OXYLABS_PASSWORD=xxx node scripts/test-oxylabs-ppv.js');
    console.log('');
  }

  for (const test of TEST_URLS) {
    console.log('-'.repeat(60));
    console.log(`Test: ${test.name}`);
    console.log(`URL: ${test.url}`);
    console.log('');

    // Test direct first
    console.log('Direct (no proxy):');
    try {
      const direct = await fetchDirect(test.url, test.headers);
      console.log(`  Status: ${direct.status}`);
      console.log(`  Size: ${direct.size} bytes`);
      if (direct.status === 200 && direct.body.includes('#EXTM3U')) {
        console.log('  Content: Valid M3U8 playlist ✅');
        console.log('  Preview:');
        console.log(direct.body.split('\n').slice(0, 10).map(l => '    ' + l).join('\n'));
      } else if (direct.status === 200) {
        console.log(`  Preview: ${direct.body.substring(0, 100)}...`);
      } else {
        console.log(`  Body: ${direct.body.substring(0, 200)}`);
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }

    console.log('');

    // Test via proxy
    if (OXYLABS_USERNAME !== 'YOUR_USERNAME') {
      console.log('Via Oxylabs Proxy:');
      try {
        const proxied = await fetchViaProxy(test.url, test.headers);
        console.log(`  Status: ${proxied.status}`);
        console.log(`  Size: ${proxied.size} bytes`);
        if (proxied.status === 200 && proxied.body.includes('#EXTM3U')) {
          console.log('  Content: Valid M3U8 playlist ✅');
          console.log('  Preview:');
          console.log(proxied.body.split('\n').slice(0, 15).map(l => '    ' + l).join('\n'));
          
          // Extract segment URLs
          const segments = proxied.body.split('\n').filter(l => l.trim() && !l.startsWith('#'));
          if (segments.length > 0) {
            console.log('');
            console.log('  Segment URLs found:');
            segments.slice(0, 3).forEach(s => console.log(`    ${s}`));
          }
        } else if (proxied.status === 200) {
          console.log(`  Preview: ${proxied.body.substring(0, 200)}...`);
        } else {
          console.log(`  Body: ${proxied.body.substring(0, 300)}`);
        }
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    } else {
      console.log('Via Oxylabs Proxy: SKIPPED (no credentials)');
    }

    console.log('');
  }

  console.log('='.repeat(60));
  console.log('Summary:');
  console.log('- If poocloud.in works via proxy but not direct = IP ban confirmed');
  console.log('- If vidsaver.io works direct = segments can bypass proxy');
  console.log('- Bandwidth: ~1-2KB per m3u8 fetch, refreshes every 3-5 sec');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
