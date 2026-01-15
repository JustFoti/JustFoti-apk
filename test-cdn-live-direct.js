/**
 * Direct CDN-LIVE Stream URL Extractor
 * 
 * Fetches a player page, decodes the obfuscated JavaScript, and extracts the m3u8 URL
 */

const https = require('https');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const CDN_LIVE_PLAYER_BASE = 'https://cdn-live.tv/api/v1/channels/player/';

// Decoder constants (from cdn-live.tv player page)
const _0xc18e = ["", "split", "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/", "slice", "indexOf", "", "", ".", "pow", "reduce", "reverse", "0"];

function _0xe11c(d, e, f) {
  const g = _0xc18e[2][_0xc18e[1]](_0xc18e[0]); // "0123456789...".split("")
  const h = g[_0xc18e[3]](0, e); // g.slice(0, e)
  const i = g[_0xc18e[3]](0, f); // g.slice(0, f)
  let j = d[_0xc18e[1]](_0xc18e[0])[_0xc18e[10]]()[_0xc18e[9]](function(a, b, c) {
    if (h[_0xc18e[4]](b) !== -1) {
      return a + h[_0xc18e[4]](b) * (Math[_0xc18e[8]](e, c));
    }
    return a;
  }, 0);
  let k = _0xc18e[0];
  while (j > 0) {
    k = i[j % f] + k;
    j = (j - (j % f)) / f;
  }
  return k || _0xc18e[11];
}

function decode(h, u, n, t, e, r) {
  r = "";
  for (let i = 0, len = h.length; i < len; i++) {
    let s = "";
    while (i < len && h[i] !== n[e]) {
      s += h[i];
      i++;
    }
    for (let j = 0; j < n.length; j++) {
      s = s.replace(new RegExp(n[j], "g"), j.toString());
    }
    const charCode = parseInt(_0xe11c(s, e, 10), 10) - t;
    r += String.fromCharCode(charCode);
  }
  try {
    return decodeURIComponent(escape(r));
  } catch {
    return r;
  }
}

async function fetchPlayerPage(channel, country = 'us') {
  const url = `${CDN_LIVE_PLAYER_BASE}?name=${channel}&code=${country}&user=cdnlivetv&plan=free`;
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function extractStreamUrl(channel, country = 'us') {
  console.log(`\n=== Fetching ${channel.toUpperCase()} (${country}) ===\n`);
  
  const html = await fetchPlayerPage(channel, country);
  
  // Find the eval() call
  const evalMatch = html.match(/eval\(function\(h,u,n,t,e,r\)\{[\s\S]+?\}\("([^"]+)",(\d+),"([^"]+)",(\d+),(\d+),(\d+)\)\)/);
  
  if (!evalMatch) {
    throw new Error('Could not find obfuscated code in player page');
  }

  const [, encodedData, uStr, charset, baseStr, eStr, offsetStr] = evalMatch;
  const u = parseInt(uStr);
  const base = parseInt(baseStr);
  const e = parseInt(eStr);
  const offset = parseInt(offsetStr);

  console.log('Decoder Parameters:');
  console.log('  U:', u);
  console.log('  Charset:', charset);
  console.log('  Base:', base);
  console.log('  E:', e);
  console.log('  Offset:', offset);
  console.log('  Encoded length:', encodedData.length);

  // Decode
  const decoded = decode(encodedData, u, charset, offset, e, "");
  
  // Look for the playlistUrl assignment - it should be near the beginning
  // Pattern: const playlistUrl = "https://..."
  const patterns = [
    /const\s+playlistUrl\s*=\s*"([^"]+)"/i,
    /playlistUrl\s*=\s*"([^"]+)"/i,
    /const\s+\w+\s*=\s*"(https:\/\/[^"]+\.m3u8[^"]*)"/,
  ];
  
  let streamUrl = null;
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) {
      streamUrl = match[1];
      console.log(`\n✓ Found URL with pattern: ${pattern}`);
      break;
    }
  }
  
  if (!streamUrl) {
    // Save for debugging
    const fs = require('fs');
    const filename = `decoded-${channel}-${Date.now()}.js`;
    fs.writeFileSync(filename, decoded);
    console.log(`\n✗ Could not find URL, saved to ${filename}`);
    console.log('\n=== First 1000 chars of decoded output ===');
    console.log(decoded.substring(0, 1000));
    return null;
  }
  
  console.log('\n✓ Stream URL extracted successfully!');
  console.log('\nStream URL:');
  console.log(streamUrl);
  
  // Validate it's not the honeypot
  if (streamUrl.toLowerCase().includes('flyx.m3u8')) {
    console.log('\n⚠️  WARNING: This is the honeypot file (flyx.m3u8)!');
    return null;
  }
  
  // Validate pattern
  const urlObj = new URL(streamUrl);
  const validPattern = /\/api\/v1\/channels\/[a-z]{2}-[\w-]+\/(index|playlist)\.m3u8/i;
  
  if (!validPattern.test(urlObj.pathname)) {
    console.log('\n⚠️  WARNING: URL does not match expected pattern!');
    console.log('Pathname:', urlObj.pathname);
  } else {
    console.log('\n✓ URL pattern is valid');
  }
  
  return streamUrl;
}

// Test with multiple channels
async function main() {
  const channels = [
    { name: 'abc', country: 'us' },
    { name: 'espn', country: 'us' },
    { name: 'cnn', country: 'us' },
  ];
  
  const results = [];
  
  for (const { name, country } of channels) {
    try {
      const url = await extractStreamUrl(name, country);
      if (url) {
        results.push({ channel: name, country, url, success: true });
      }
    } catch (error) {
      console.log(`\n✗ Failed: ${error.message}`);
      results.push({ channel: name, country, error: error.message, success: false });
    }
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n\n=== SUMMARY ===\n');
  results.forEach(r => {
    if (r.success) {
      console.log(`✓ ${r.channel.toUpperCase()}: ${r.url}`);
    } else {
      console.log(`✗ ${r.channel.toUpperCase()}: ${r.error}`);
    }
  });
}

main().catch(console.error);
