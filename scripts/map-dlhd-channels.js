#!/usr/bin/env node
/**
 * DLHD Channel Mapper
 * 
 * Maps ALL DLHD channels to their correct channel keys and working servers.
 * Extracts data from topembed.pw which has the real channel keys.
 */

const https = require('https');
const http = require('http');

// Known DLHD channel IDs (from their site)
// Range is 1-1200 to cover ALL channels
const CHANNEL_RANGE_START = 1;
const CHANNEL_RANGE_END = 1200;

// Results storage
const channelMap = {};
const errors = [];

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    const urlObj = new URL(url);
    
    const req = lib.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://dlhd.link/',
        ...options.headers,
      },
      timeout: options.timeout || 10000,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: Buffer.concat(chunks),
          text: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

function decodeJWT(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4 !== 0) payload += '=';
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

async function getChannelFromDLHD(channelId) {
  try {
    // First, get the watch page to find the topembed channel name
    const watchUrl = `https://dlhd.link/watch/stream-${channelId}.php`;
    const watchRes = await fetch(watchUrl, { timeout: 8000 });
    
    if (watchRes.status !== 200) {
      return { id: channelId, error: `Watch page HTTP ${watchRes.status}` };
    }
    
    // Extract topembed channel name from iframe
    const iframeMatch = watchRes.text.match(/topembed\.pw\/channel\/([^"'\s]+)/);
    if (!iframeMatch) {
      // Try hitsplay.fun as fallback
      const hitsplayMatch = watchRes.text.match(/hitsplay\.fun\/premiumtv\/daddyhd\.php\?id=(\d+)/);
      if (hitsplayMatch) {
        return { id: channelId, source: 'hitsplay', channelKey: `premium${channelId}` };
      }
      return { id: channelId, error: 'No player iframe found' };
    }
    
    const topembedName = iframeMatch[1];
    
    // Now fetch the topembed page to get the JWT with the real channel key
    const topembedUrl = `https://topembed.pw/channel/${topembedName}`;
    const topembedRes = await fetch(topembedUrl, { timeout: 8000 });
    
    if (topembedRes.status !== 200) {
      return { id: channelId, topembedName, error: `Topembed HTTP ${topembedRes.status}` };
    }
    
    // Extract JWT
    const jwtMatch = topembedRes.text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (!jwtMatch) {
      return { id: channelId, topembedName, error: 'No JWT found' };
    }
    
    const payload = decodeJWT(jwtMatch[0]);
    if (!payload || !payload.sub) {
      return { id: channelId, topembedName, error: 'Invalid JWT payload' };
    }
    
    // Get the server key from server_lookup
    let serverKey = null;
    try {
      const lookupUrl = `https://chevy.dvalna.ru/server_lookup?channel_id=${payload.sub}`;
      const lookupRes = await fetch(lookupUrl, { timeout: 5000 });
      if (lookupRes.status === 200 && lookupRes.text) {
        const lookupData = JSON.parse(lookupRes.text);
        serverKey = lookupData.server_key;
      }
    } catch {}
    
    return {
      id: channelId,
      topembedName,
      channelKey: payload.sub,
      country: payload.country,
      serverKey,
      source: 'topembed',
    };
  } catch (e) {
    return { id: channelId, error: e.message };
  }
}

async function mapAllChannels() {
  console.log('DLHD Channel Mapper');
  console.log('===================\n');
  console.log(`Scanning channels ${CHANNEL_RANGE_START} to ${CHANNEL_RANGE_END}...\n`);
  
  const results = [];
  const batchSize = 10; // Process 10 channels at a time
  
  for (let i = CHANNEL_RANGE_START; i <= CHANNEL_RANGE_END; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, CHANNEL_RANGE_END + 1); j++) {
      batch.push(getChannelFromDLHD(j));
    }
    
    const batchResults = await Promise.all(batch);
    
    for (const result of batchResults) {
      if (result.channelKey) {
        results.push(result);
        console.log(`✓ Channel ${result.id}: ${result.topembedName || 'hitsplay'} → ${result.channelKey} (server: ${result.serverKey || 'unknown'})`);
      } else if (result.error && !result.error.includes('404') && !result.error.includes('No player')) {
        console.log(`✗ Channel ${result.id}: ${result.error}`);
      }
    }
    
    // Progress indicator
    if (i % 50 === 0) {
      console.log(`\n--- Progress: ${i}/${CHANNEL_RANGE_END} (${results.length} channels found) ---\n`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  return results;
}

async function main() {
  const startTime = Date.now();
  
  const channels = await mapAllChannels();
  
  console.log('\n\n========================================');
  console.log('RESULTS');
  console.log('========================================\n');
  
  console.log(`Total channels found: ${channels.length}`);
  console.log(`Time taken: ${Math.round((Date.now() - startTime) / 1000)}s\n`);
  
  // Group by server key
  const byServer = {};
  for (const ch of channels) {
    const server = ch.serverKey || 'unknown';
    if (!byServer[server]) byServer[server] = [];
    byServer[server].push(ch);
  }
  
  console.log('Channels by server:');
  for (const [server, chs] of Object.entries(byServer)) {
    console.log(`  ${server}: ${chs.length} channels`);
  }
  
  // Generate TypeScript mapping
  console.log('\n\n========================================');
  console.log('TYPESCRIPT MAPPING (copy to tv-proxy.ts)');
  console.log('========================================\n');
  
  console.log('// DLHD Channel ID → Channel Key mapping');
  console.log('// Generated by scripts/map-dlhd-channels.js');
  console.log('const DLHD_CHANNEL_KEYS: Record<string, { key: string; server?: string; name: string }> = {');
  
  for (const ch of channels.sort((a, b) => parseInt(a.id) - parseInt(b.id))) {
    const name = ch.topembedName || `premium${ch.id}`;
    const serverPart = ch.serverKey ? `, server: '${ch.serverKey}'` : '';
    console.log(`  '${ch.id}': { key: '${ch.channelKey}', name: '${name}'${serverPart} },`);
  }
  
  console.log('};');
  
  // Also output as JSON for reference
  const outputPath = 'data/dlhd-channels.json';
  const fs = require('fs');
  fs.writeFileSync(outputPath, JSON.stringify(channels, null, 2));
  console.log(`\nFull data saved to: ${outputPath}`);
}

main().catch(console.error);
