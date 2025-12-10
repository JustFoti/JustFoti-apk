/**
 * DLHD Residential IP Validation Test
 * 
 * Tests each component of DLHD streaming to identify which parts
 * require residential IP access:
 * 
 * 1. Server lookup (metadata) - should work from any IP
 * 2. M3U8 playlist fetch - might work from datacenter
 * 3. Key fetch - likely requires residential IP
 * 4. Segment fetch - might work from datacenter
 * 
 * Usage: node scripts/test-dlhd-residential-ip.js [channel]
 */

const https = require('https');
const http = require('http');

const CHANNEL = process.argv[2] || '325';
const PLAYER_DOMAINS = ['dlhd.dad', 'daddyhd.com', 'epicplayplay.cfd'];

const results = {
  serverLookup: { success: false, error: null, data: null },
  m3u8Fetch: { success: false, error: null, data: null, url: null },
  keyFetch: { success: false, error: null, data: null, url: null },
  segmentFetch: { success: false, error: null, data: null, url: null },
};

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': options.referer || 'https://epicplayplay.cfd/',
        'Origin': (options.referer || 'https://epicplayplay.cfd').replace(/\/$/, ''),
        ...options.headers,
      },
      timeout: 15000,
    };

    const req = client.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          text: () => body.toString('utf8'),
          json: () => JSON.parse(body.toString('utf8')),
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function testServerLookup() {
  console.log('\n📡 Testing Server Lookup...');
  const channelKey = `premium${CHANNEL}`;
  
  for (const domain of PLAYER_DOMAINS) {
    const url = `https://${domain}/server_lookup.js?channel_id=${channelKey}`;
    console.log(`   Trying: ${domain}`);
    
    try {
      const res = await fetch(url, { referer: `https://${domain}/` });
      
      if (res.status === 200) {
        const data = res.json();
        if (data.server_key) {
          results.serverLookup = {
            success: true,
            error: null,
            data: { domain, serverKey: data.server_key, channelKey },
          };
          console.log(`   ✅ Success! Server key: ${data.server_key}`);
          return data.server_key;
        }
      }
      console.log(`   ❌ Status ${res.status}`);
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }
  
  results.serverLookup.error = 'All domains failed';
  return null;
}

async function testM3U8Fetch(serverKey) {
  console.log('\n📺 Testing M3U8 Playlist Fetch...');
  
  if (!serverKey) {
    results.m3u8Fetch.error = 'No server key available';
    console.log('   ⚠️ Skipped - no server key');
    return null;
  }
  
  const channelKey = `premium${CHANNEL}`;
  let m3u8Url;
  
  if (serverKey === 'top1/cdn') {
    m3u8Url = `https://top1.giokko.ru/top1/cdn/${channelKey}/mono.css`;
  } else {
    m3u8Url = `https://${serverKey}new.giokko.ru/${serverKey}/${channelKey}/mono.css`;
  }
  
  console.log(`   URL: ${m3u8Url}`);
  results.m3u8Fetch.url = m3u8Url;
  
  try {
    const res = await fetch(m3u8Url + `?_t=${Date.now()}`);
    const content = res.text();
    
    console.log(`   Status: ${res.status}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);
    console.log(`   Content Length: ${content.length} bytes`);
    
    if (res.status === 200 && (content.includes('#EXTM3U') || content.includes('#EXT-X-'))) {
      results.m3u8Fetch.success = true;
      results.m3u8Fetch.data = {
        contentLength: content.length,
        hasExtM3U: content.includes('#EXTM3U'),
        hasKey: content.includes('#EXT-X-KEY'),
        preview: content.substring(0, 500),
      };
      console.log(`   ✅ Valid M3U8 playlist received`);
      console.log(`   Has encryption key: ${content.includes('#EXT-X-KEY')}`);
      return content;
    } else {
      results.m3u8Fetch.error = `Invalid response: status=${res.status}, content preview: ${content.substring(0, 100)}`;
      console.log(`   ❌ Invalid M3U8 content`);
      console.log(`   Preview: ${content.substring(0, 200)}`);
    }
  } catch (err) {
    results.m3u8Fetch.error = err.message;
    console.log(`   ❌ Error: ${err.message}`);
  }
  
  return null;
}

async function testKeyFetch(m3u8Content) {
  console.log('\n🔑 Testing Encryption Key Fetch...');
  
  if (!m3u8Content) {
    results.keyFetch.error = 'No M3U8 content available';
    console.log('   ⚠️ Skipped - no M3U8 content');
    return false;
  }
  
  // Extract key URL from M3U8
  const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
  if (!keyMatch) {
    results.keyFetch.error = 'No key URL found in M3U8';
    console.log('   ⚠️ No encryption key in playlist');
    return true; // Not encrypted, so technically "works"
  }
  
  const keyUrl = keyMatch[1];
  console.log(`   Key URL: ${keyUrl}`);
  results.keyFetch.url = keyUrl;
  
  try {
    const res = await fetch(keyUrl);
    
    console.log(`   Status: ${res.status}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);
    console.log(`   Content Length: ${res.body.length} bytes`);
    
    if (res.status === 200 && res.body.length === 16) {
      results.keyFetch.success = true;
      results.keyFetch.data = {
        keyLength: res.body.length,
        keyHex: res.body.toString('hex'),
      };
      console.log(`   ✅ Valid 16-byte AES key received`);
      console.log(`   Key (hex): ${res.body.toString('hex')}`);
      return true;
    } else if (res.status === 200) {
      results.keyFetch.error = `Unexpected key size: ${res.body.length} bytes (expected 16)`;
      results.keyFetch.data = { 
        keyLength: res.body.length,
        preview: res.body.toString('utf8').substring(0, 100),
      };
      console.log(`   ⚠️ Received ${res.body.length} bytes (expected 16)`);
      console.log(`   Content: ${res.body.toString('utf8').substring(0, 100)}`);
    } else {
      results.keyFetch.error = `HTTP ${res.status}`;
      results.keyFetch.data = { 
        status: res.status,
        body: res.body.toString('utf8').substring(0, 200),
      };
      console.log(`   ❌ Failed with status ${res.status}`);
      console.log(`   Response: ${res.body.toString('utf8').substring(0, 200)}`);
    }
  } catch (err) {
    results.keyFetch.error = err.message;
    console.log(`   ❌ Error: ${err.message}`);
  }
  
  return false;
}

async function testSegmentFetch(m3u8Content) {
  console.log('\n🎬 Testing Segment Fetch...');
  
  if (!m3u8Content) {
    results.segmentFetch.error = 'No M3U8 content available';
    console.log('   ⚠️ Skipped - no M3U8 content');
    return false;
  }
  
  // Extract first segment URL
  const lines = m3u8Content.split('\n');
  let segmentUrl = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('http') && !trimmed.includes('URI=')) {
      segmentUrl = trimmed;
      break;
    }
  }
  
  if (!segmentUrl) {
    results.segmentFetch.error = 'No segment URL found in M3U8';
    console.log('   ⚠️ No segment URLs in playlist');
    return false;
  }
  
  console.log(`   Segment URL: ${segmentUrl.substring(0, 100)}...`);
  results.segmentFetch.url = segmentUrl;
  
  try {
    const res = await fetch(segmentUrl);
    
    console.log(`   Status: ${res.status}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);
    console.log(`   Content Length: ${res.body.length} bytes`);
    
    if (res.status === 200 && res.body.length > 1000) {
      results.segmentFetch.success = true;
      results.segmentFetch.data = {
        segmentSize: res.body.length,
        contentType: res.headers['content-type'],
      };
      console.log(`   ✅ Segment received (${(res.body.length / 1024).toFixed(1)} KB)`);
      return true;
    } else {
      results.segmentFetch.error = `Invalid segment: status=${res.status}, size=${res.body.length}`;
      console.log(`   ❌ Invalid segment response`);
    }
  } catch (err) {
    results.segmentFetch.error = err.message;
    console.log(`   ❌ Error: ${err.message}`);
  }
  
  return false;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('       DLHD Residential IP Validation Test');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Channel: ${CHANNEL}`);
  console.log(`Testing from: ${process.env.COMPUTERNAME || 'local machine'}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  // Run tests in sequence
  const serverKey = await testServerLookup();
  const m3u8Content = await testM3U8Fetch(serverKey);
  await testKeyFetch(m3u8Content);
  await testSegmentFetch(m3u8Content);
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                      SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  
  const tests = [
    { name: 'Server Lookup', result: results.serverLookup, note: 'Metadata only, should work anywhere' },
    { name: 'M3U8 Playlist', result: results.m3u8Fetch, note: 'Playlist structure' },
    { name: 'Encryption Key', result: results.keyFetch, note: 'LIKELY requires residential IP' },
    { name: 'Video Segment', result: results.segmentFetch, note: 'May require residential IP' },
  ];
  
  for (const test of tests) {
    const status = test.result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status} - ${test.name}`);
    console.log(`   Note: ${test.note}`);
    if (test.result.error) {
      console.log(`   Error: ${test.result.error}`);
    }
    if (test.result.url) {
      console.log(`   URL: ${test.result.url.substring(0, 80)}...`);
    }
  }
  
  // Conclusion
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    CONCLUSION');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (results.serverLookup.success && results.m3u8Fetch.success && 
      !results.keyFetch.success && results.segmentFetch.success) {
    console.log('\n🎯 CONFIRMED: Only the encryption KEY requires residential IP!');
    console.log('   - Server lookup: Works from datacenter ✅');
    console.log('   - M3U8 playlist: Works from datacenter ✅');
    console.log('   - Encryption key: BLOCKED from datacenter ❌');
    console.log('   - Video segments: Works from datacenter ✅');
    console.log('\n   Solution: Only proxy the /key endpoint through residential IP');
  } else if (!results.keyFetch.success && !results.segmentFetch.success) {
    console.log('\n🔒 Both KEY and SEGMENTS require residential IP');
    console.log('   Full proxy through residential IP is needed');
  } else if (results.keyFetch.success && results.segmentFetch.success) {
    console.log('\n✅ Everything works from this IP!');
    console.log('   No residential IP proxy needed');
  } else {
    console.log('\n⚠️ Mixed results - further investigation needed');
  }
  
  // Output JSON results
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                  RAW RESULTS (JSON)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
