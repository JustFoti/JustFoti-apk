#!/usr/bin/env node
/**
 * Test DLHD channels through CF Worker with WASM PoW
 * Validates the full flow: CF Worker → WASM PoW → RPI → Key Server
 */

const CF_WORKER_URL = 'https://media-proxy.vynx.workers.dev/tv';

// Test channels - mix of different server types
const TEST_CHANNELS = [
  { id: '35', name: 'Sky Sports Football [UK]', serverKey: 'top2' },
  { id: '44', name: 'ESPN [USA]', serverKey: 'hzt' },
  { id: '51', name: 'ABC [USA]', serverKey: 'wiki' },
  { id: '130', name: 'Sky Sports PL [UK]', serverKey: 'top2' },
  { id: '366', name: 'Sky Sports News [UK]', serverKey: 'top1' },
  { id: '356', name: 'BBC One [UK]', serverKey: 'x4' },
  { id: '425', name: 'beIN Sports USA', serverKey: 'top2' },
  { id: '588', name: 'Sky Sport 1 [NZ]', serverKey: 'azo' },
  { id: '101', name: 'Sportklub 1 [Serbia]', serverKey: 'max2' },
  { id: '31', name: 'TNT Sports 1 [UK]', serverKey: 'top1' },
];

async function testChannel(channel) {
  const start = Date.now();
  const url = `${CF_WORKER_URL}?channel=${channel.id}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://tv.vynx.cc',
        'Referer': 'https://tv.vynx.cc/',
      },
      timeout: 30000,
    });
    
    const elapsed = Date.now() - start;
    
    if (!res.ok) {
      const text = await res.text();
      return { 
        channel, 
        success: false, 
        error: `HTTP ${res.status}`, 
        details: text.substring(0, 200),
        elapsed 
      };
    }
    
    const m3u8 = await res.text();
    
    // Check if it's a valid M3U8
    if (!m3u8.includes('#EXTM3U')) {
      return { 
        channel, 
        success: false, 
        error: 'Invalid M3U8', 
        details: m3u8.substring(0, 200),
        elapsed 
      };
    }
    
    // Check if it has key URLs (encrypted stream)
    const hasKey = m3u8.includes('URI="') && m3u8.includes('/key');
    const hasSegments = m3u8.includes('.ts') || m3u8.includes('/segment');
    
    // Try to fetch a key to validate the full flow
    let keyStatus = 'no-key';
    if (hasKey) {
      const keyMatch = m3u8.match(/URI="([^"]+)"/);
      if (keyMatch) {
        const keyUrl = keyMatch[1];
        // If it's a relative URL, make it absolute
        const fullKeyUrl = keyUrl.startsWith('http') ? keyUrl : `${CF_WORKER_URL}${keyUrl.startsWith('/') ? '' : '/'}${keyUrl}`;
        
        try {
          const keyRes = await fetch(fullKeyUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Origin': 'https://tv.vynx.cc',
              'Referer': 'https://tv.vynx.cc/',
            },
          });
          
          if (keyRes.ok) {
            const keyData = await keyRes.arrayBuffer();
            if (keyData.byteLength === 16) {
              keyStatus = '✅ key-valid';
            } else {
              keyStatus = `❌ key-invalid (${keyData.byteLength} bytes)`;
            }
          } else {
            const keyErr = await keyRes.text();
            keyStatus = `❌ key-failed: ${keyRes.status} - ${keyErr.substring(0, 100)}`;
          }
        } catch (e) {
          keyStatus = `❌ key-error: ${e.message}`;
        }
      }
    }
    
    return {
      channel,
      success: true,
      hasKey,
      hasSegments,
      keyStatus,
      elapsed,
      lines: m3u8.split('\n').length,
    };
  } catch (e) {
    return { 
      channel, 
      success: false, 
      error: e.message,
      elapsed: Date.now() - start 
    };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('DLHD Channel Test via CF Worker (WASM PoW)');
  console.log(`Worker: ${CF_WORKER_URL}`);
  console.log('='.repeat(80));
  console.log('');
  
  const results = [];
  
  for (const channel of TEST_CHANNELS) {
    process.stdout.write(`Testing ${channel.id.padStart(3)} ${channel.name.padEnd(30)} [${channel.serverKey}]... `);
    
    const result = await testChannel(channel);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.elapsed}ms ${result.keyStatus}`);
    } else {
      console.log(`❌ ${result.error}`);
      if (result.details) {
        console.log(`   Details: ${result.details.substring(0, 100)}`);
      }
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const keysValid = results.filter(r => r.keyStatus?.includes('✅'));
  
  console.log(`Total: ${results.length}`);
  console.log(`M3U8 Success: ${successful.length}/${results.length}`);
  console.log(`Keys Valid: ${keysValid.length}/${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('');
    console.log('Failed channels:');
    for (const f of failed) {
      console.log(`  - ${f.channel.id} ${f.channel.name}: ${f.error}`);
    }
  }
  
  const keyFailed = results.filter(r => r.success && r.keyStatus?.includes('❌'));
  if (keyFailed.length > 0) {
    console.log('');
    console.log('Key fetch failed:');
    for (const f of keyFailed) {
      console.log(`  - ${f.channel.id} ${f.channel.name}: ${f.keyStatus}`);
    }
  }
}

main().catch(console.error);
