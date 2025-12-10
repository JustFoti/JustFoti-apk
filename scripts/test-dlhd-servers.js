#!/usr/bin/env node
/**
 * DLHD Server Investigation Script
 * 
 * Investigates server_lookup.js to find which servers provide uStream (unencrypted) alternatives.
 * 
 * Usage: node scripts/test-dlhd-servers.js [channelId]
 */

const https = require('https');

const PLAYER_DOMAINS = ['epicplayplay.cfd', 'daddyhd.com', 'dlhd.dad'];

// Known server keys and their encryption status
const KNOWN_SERVERS = {
  // Encrypted (AES-128 keys required)
  'nfs': { encrypted: true, note: 'Uses wmsxx.php keys' },
  'dokko1': { encrypted: true, note: 'Uses wmsxx.php keys' },
  'zeko': { encrypted: true, note: 'Uses wmsxx.php keys' },
  'top1/cdn': { encrypted: true, note: 'Uses wmsxx.php keys' },
  
  // Potentially unencrypted (uStream)
  // We need to discover these
};

async function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

async function getServerKey(channelKey, domain) {
  const url = `https://${domain}/server_lookup.js?channel_id=${channelKey}`;
  try {
    const response = await fetch(url, {
      'Referer': `https://${domain}/`,
      'Origin': `https://${domain}`,
    });
    
    if (response.status === 200) {
      try {
        return JSON.parse(response.data);
      } catch {
        return { error: 'Invalid JSON', raw: response.data.substring(0, 100) };
      }
    }
    return { error: `HTTP ${response.status}` };
  } catch (err) {
    return { error: err.message };
  }
}

async function checkM3U8(serverKey, channelKey) {
  let m3u8Url;
  if (serverKey === 'top1/cdn') {
    m3u8Url = `https://top1.giokko.ru/top1/cdn/${channelKey}/mono.css`;
  } else {
    m3u8Url = `https://${serverKey}new.giokko.ru/${serverKey}/${channelKey}/mono.css`;
  }
  
  try {
    const response = await fetch(m3u8Url, {
      'Referer': 'https://epicplayplay.cfd/',
    });
    
    if (response.status !== 200) {
      return { url: m3u8Url, status: response.status, encrypted: null };
    }
    
    const content = response.data;
    const hasKey = content.includes('EXT-X-KEY') || content.includes('URI=');
    const keyMatch = content.match(/URI="([^"]+)"/);
    
    return {
      url: m3u8Url,
      status: response.status,
      encrypted: hasKey,
      keyUrl: keyMatch ? keyMatch[1] : null,
      preview: content.substring(0, 500),
    };
  } catch (err) {
    return { url: m3u8Url, error: err.message };
  }
}

async function investigateChannel(channelId) {
  const channelKey = `premium${channelId}`;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Channel: ${channelKey}`);
  console.log('='.repeat(60));
  
  // Check all domains for server lookup
  const serverResults = {};
  for (const domain of PLAYER_DOMAINS) {
    const result = await getServerKey(channelKey, domain);
    serverResults[domain] = result;
    
    if (result.server_key) {
      console.log(`  ${domain}: server_key = "${result.server_key}"`);
      if (result.server_key2) console.log(`    server_key2 = "${result.server_key2}"`);
      if (result.server_key3) console.log(`    server_key3 = "${result.server_key3}"`);
    } else if (result.error) {
      console.log(`  ${domain}: ${result.error}`);
    } else {
      console.log(`  ${domain}: ${JSON.stringify(result)}`);
    }
  }
  
  // Find unique server keys
  const serverKeys = new Set();
  for (const result of Object.values(serverResults)) {
    if (result.server_key) serverKeys.add(result.server_key);
    if (result.server_key2) serverKeys.add(result.server_key2);
    if (result.server_key3) serverKeys.add(result.server_key3);
  }
  
  console.log(`\nUnique server keys: ${[...serverKeys].join(', ') || 'none'}`);
  
  // Check M3U8 for each server key
  console.log('\nM3U8 Analysis:');
  for (const serverKey of serverKeys) {
    const m3u8Result = await checkM3U8(serverKey, channelKey);
    console.log(`\n  Server: ${serverKey}`);
    console.log(`    URL: ${m3u8Result.url}`);
    console.log(`    Status: ${m3u8Result.status || m3u8Result.error}`);
    if (m3u8Result.encrypted !== null) {
      console.log(`    Encrypted: ${m3u8Result.encrypted ? 'YES (AES-128)' : 'NO (uStream?)'}`);
      if (m3u8Result.keyUrl) {
        console.log(`    Key URL: ${m3u8Result.keyUrl}`);
      }
    }
  }
  
  return { channelKey, serverResults, serverKeys: [...serverKeys] };
}

async function scanChannels(start, end) {
  console.log(`\nScanning channels ${start} to ${end}...`);
  console.log('Looking for unencrypted (uStream) alternatives...\n');
  
  const results = {
    encrypted: [],
    unencrypted: [],
    failed: [],
    serverStats: {},
  };
  
  for (let id = start; id <= end; id++) {
    const channelKey = `premium${id}`;
    process.stdout.write(`\rChecking ${channelKey}...`);
    
    // Quick check - just get server key and check M3U8
    let serverKey = null;
    for (const domain of PLAYER_DOMAINS) {
      const result = await getServerKey(channelKey, domain);
      if (result.server_key) {
        serverKey = result.server_key;
        break;
      }
    }
    
    if (!serverKey) {
      results.failed.push({ id, reason: 'No server key' });
      continue;
    }
    
    // Track server usage
    results.serverStats[serverKey] = (results.serverStats[serverKey] || 0) + 1;
    
    const m3u8Result = await checkM3U8(serverKey, channelKey);
    
    if (m3u8Result.error || m3u8Result.status !== 200) {
      results.failed.push({ id, serverKey, reason: m3u8Result.error || `HTTP ${m3u8Result.status}` });
    } else if (m3u8Result.encrypted) {
      results.encrypted.push({ id, serverKey, keyUrl: m3u8Result.keyUrl });
    } else {
      results.unencrypted.push({ id, serverKey });
      console.log(`\n  ✓ UNENCRYPTED: premium${id} (${serverKey})`);
    }
  }
  
  console.log('\n\n' + '='.repeat(60));
  console.log('SCAN RESULTS');
  console.log('='.repeat(60));
  console.log(`\nServer usage:`);
  for (const [server, count] of Object.entries(results.serverStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${server}: ${count} channels`);
  }
  console.log(`\nEncrypted channels: ${results.encrypted.length}`);
  console.log(`Unencrypted channels: ${results.unencrypted.length}`);
  console.log(`Failed channels: ${results.failed.length}`);
  
  if (results.unencrypted.length > 0) {
    console.log(`\nUnencrypted channel IDs: ${results.unencrypted.map(c => c.id).join(', ')}`);
  }
  
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'scan') {
    const start = parseInt(args[1]) || 1;
    const end = parseInt(args[2]) || 50;
    await scanChannels(start, end);
  } else if (args[0]) {
    // Single channel investigation
    await investigateChannel(args[0]);
  } else {
    // Default: investigate a few known channels
    console.log('DLHD Server Investigation');
    console.log('Usage:');
    console.log('  node scripts/test-dlhd-servers.js <channelId>     - Investigate single channel');
    console.log('  node scripts/test-dlhd-servers.js scan <start> <end> - Scan range of channels');
    console.log('\nRunning default investigation on channels 51, 303, 371, 769...\n');
    
    // Test channels: 51 (works), 303 (418), 371 (uStream?), 769 (418)
    for (const id of [51, 303, 371, 769, 1, 325]) {
      await investigateChannel(id);
    }
  }
}

main().catch(console.error);
