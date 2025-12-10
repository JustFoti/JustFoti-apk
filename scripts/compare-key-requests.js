#!/usr/bin/env node
/**
 * Compare key requests between working and non-working channels
 * to find what's different about the 418 responses
 */

const https = require('https');

// Known working vs non-working channels
const WORKING = ['premium51', 'premium1'];
const NOT_WORKING = ['premium303', 'premium769', 'premium302'];

async function getServerKey(channel) {
  return new Promise((resolve) => {
    https.get(`https://epicplayplay.cfd/server_lookup.js?channel_id=${channel}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ error: 'parse error' }); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function getM3U8(serverKey, channel) {
  const url = `https://${serverKey}new.giokko.ru/${serverKey}/${channel}/mono.css`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const keyMatch = data.match(/URI="([^"]+)"/);
        const ivMatch = data.match(/IV=0x([a-fA-F0-9]+)/);
        resolve({
          status: res.statusCode,
          hasKey: data.includes('EXT-X-KEY'),
          keyUrl: keyMatch?.[1] || null,
          iv: ivMatch?.[1] || null,
          content: data
        });
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function testKeyFetch(keyUrl) {
  return new Promise((resolve) => {
    const url = new URL(keyUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      }
    };
    
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
          bodyLength: body.length,
          headers: res.headers,
          bodyHex: body.length <= 32 ? body.toString('hex') : body.slice(0, 32).toString('hex') + '...'
        });
      });
    });
    
    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
}

async function analyzeChannel(channel) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`CHANNEL: ${channel}`);
  console.log('='.repeat(60));
  
  // Get server key
  const lookup = await getServerKey(channel);
  console.log(`Server key: ${lookup.server_key || 'NOT FOUND'}`);
  
  if (!lookup.server_key) {
    console.log('  -> Channel not available');
    return { channel, available: false };
  }
  
  // Get M3U8
  const m3u8 = await getM3U8(lookup.server_key, channel);
  console.log(`M3U8 status: ${m3u8.status}`);
  console.log(`Encrypted: ${m3u8.hasKey}`);
  
  if (!m3u8.hasKey) {
    console.log('  -> Unencrypted stream (no key needed)');
    return { channel, available: true, encrypted: false };
  }
  
  console.log(`Key URL: ${m3u8.keyUrl}`);
  console.log(`IV: ${m3u8.iv}`);
  
  // Parse key URL to understand the pattern
  if (m3u8.keyUrl) {
    const url = new URL(m3u8.keyUrl);
    console.log(`\nKey URL breakdown:`);
    console.log(`  Host: ${url.hostname}`);
    console.log(`  Path: ${url.pathname}`);
    for (const [key, value] of url.searchParams) {
      console.log(`  Param ${key}: ${value}`);
    }
    
    // Test key fetch
    console.log(`\nTesting key fetch...`);
    const keyResult = await testKeyFetch(m3u8.keyUrl);
    console.log(`  Status: ${keyResult.status} ${keyResult.statusMessage || ''}`);
    console.log(`  Body length: ${keyResult.bodyLength} bytes`);
    if (keyResult.bodyLength > 0 && keyResult.bodyLength <= 32) {
      console.log(`  Body (hex): ${keyResult.bodyHex}`);
    }
    
    return {
      channel,
      available: true,
      encrypted: true,
      serverKey: lookup.server_key,
      keyUrl: m3u8.keyUrl,
      keyStatus: keyResult.status,
      keyBodyLength: keyResult.bodyLength
    };
  }
  
  return { channel, available: true, encrypted: true, keyUrl: null };
}

async function main() {
  console.log('Comparing working vs non-working DLHD channels\n');
  
  const results = { working: [], notWorking: [] };
  
  console.log('\n### WORKING CHANNELS ###');
  for (const ch of WORKING) {
    const result = await analyzeChannel(ch);
    results.working.push(result);
  }
  
  console.log('\n\n### NON-WORKING CHANNELS ###');
  for (const ch of NOT_WORKING) {
    const result = await analyzeChannel(ch);
    results.notWorking.push(result);
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\nWorking channels:');
  for (const r of results.working) {
    if (r.encrypted) {
      console.log(`  ${r.channel}: server=${r.serverKey}, keyStatus=${r.keyStatus}, keySize=${r.keyBodyLength}`);
    } else {
      console.log(`  ${r.channel}: unencrypted`);
    }
  }
  
  console.log('\nNon-working channels:');
  for (const r of results.notWorking) {
    if (r.encrypted) {
      console.log(`  ${r.channel}: server=${r.serverKey}, keyStatus=${r.keyStatus}, keySize=${r.keyBodyLength}`);
    } else if (!r.available) {
      console.log(`  ${r.channel}: not available`);
    } else {
      console.log(`  ${r.channel}: unencrypted`);
    }
  }
  
  // Look for patterns
  console.log('\n\nPATTERN ANALYSIS:');
  const workingServers = new Set(results.working.filter(r => r.serverKey).map(r => r.serverKey));
  const notWorkingServers = new Set(results.notWorking.filter(r => r.serverKey).map(r => r.serverKey));
  console.log(`Working servers: ${[...workingServers].join(', ')}`);
  console.log(`Non-working servers: ${[...notWorkingServers].join(', ')}`);
  
  // Check if it's IP-based blocking
  console.log('\n\nCONCLUSION:');
  const allWorking = results.working.every(r => r.keyStatus === 200);
  const allNotWorking = results.notWorking.every(r => r.keyStatus === 418);
  
  if (allWorking && allNotWorking) {
    console.log('The 418 error is CHANNEL-SPECIFIC, not IP-based.');
    console.log('Some channels are simply blocked at the key server level.');
  } else {
    console.log('Mixed results - may be IP-based or time-based blocking.');
  }
}

main().catch(console.error);
