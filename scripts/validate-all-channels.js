/**
 * Validate ALL DLHD 24/7 Channels from our channel list
 * Tests each channel through our proxy
 * 
 * SECURITY: This is a test script - proxy URL must be provided via environment variable
 * 
 * Usage:
 *   PROXY_URL=https://your-proxy.workers.dev/tv node scripts/validate-all-channels.js
 *   node scripts/validate-all-channels.js --local  (uses localhost:8787)
 */

const fs = require('fs');
const path = require('path');

// SECURITY: Use environment variable for proxy URL - don't hardcode production URLs in source
const USE_LOCAL = process.argv.includes('--local');
const PROXY_URL = USE_LOCAL 
  ? 'http://localhost:8787/tv'
  : process.env.PROXY_URL;

if (!PROXY_URL) {
  console.error('ERROR: PROXY_URL environment variable required');
  console.error('Usage: PROXY_URL=https://your-proxy.workers.dev/tv node scripts/validate-all-channels.js');
  console.error('   or: node scripts/validate-all-channels.js --local');
  process.exit(1);
}

const CHANNELS_FILE = path.join(__dirname, '..', 'app', 'data', 'dlhd-channels.json');

async function testChannel(channelId, timeout = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const start = Date.now();
    
    // SECURITY NOTE: In production, the proxy validates Origin header against allowlist.
    // For testing, we use the allowed origin. Real anti-leech protection should use
    // signed tokens (see anti-leech-proxy.ts) or quantum-shield patterns.
    const res = await fetch(`${PROXY_URL}?channel=${channelId}`, {
      headers: {
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/',
        // Add test marker header so proxy can identify test traffic if needed
        'X-Test-Validation': 'channel-check'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `HTTP ${res.status}: ${text.substring(0, 100)}`, elapsed };
    }
    
    const text = await res.text();
    const backend = res.headers.get('x-dlhd-backend') || 'unknown';
    
    if (text.includes('#EXTM3U')) {
      return { success: true, backend, elapsed };
    } else {
      return { success: false, error: 'Invalid M3U8: ' + text.substring(0, 50), elapsed };
    }
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      return { success: false, error: 'Timeout' };
    }
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('DLHD 24/7 CHANNEL VALIDATION - ALL CHANNELS');
  console.log('='.repeat(70));
  console.log(`Proxy: ${PROXY_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  // Load channels from our JSON file
  const channelsData = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
  const channels = channelsData.channels.map(c => c.id);
  
  console.log(`Loaded ${channels.length} channels from ${CHANNELS_FILE}\n`);
  
  // Test all channels
  const results = {
    success: [],
    failed: [],
    backends: {}
  };
  
  const BATCH_SIZE = 5; // Reduced batch size to avoid triggering rate limits
  const BATCH_DELAY = 500; // Delay between batches (ms)
  const startTime = Date.now();
  
  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(channels.length / BATCH_SIZE);
    const progress = ((i / channels.length) * 100).toFixed(0);
    
    process.stdout.write(`\r[${progress}%] Testing batch ${batchNum}/${totalBatches} (${results.success.length} OK, ${results.failed.length} FAIL)...`);
    
    const batchResults = await Promise.all(
      batch.map(async (ch) => {
        const result = await testChannel(ch);
        return { channel: ch, ...result };
      })
    );
    
    for (const r of batchResults) {
      if (r.success) {
        results.success.push(r);
        results.backends[r.backend] = (results.backends[r.backend] || 0) + 1;
      } else {
        results.failed.push(r);
      }
    }
    
    // Rate limit protection: delay between batches
    if (i + BATCH_SIZE < channels.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n\n' + '='.repeat(70));
  console.log('RESULTS');
  console.log('='.repeat(70));
  
  const total = channels.length;
  const successCount = results.success.length;
  const failCount = results.failed.length;
  const successRate = ((successCount / total) * 100).toFixed(1);
  
  console.log(`\nTotal channels tested: ${total}`);
  console.log(`✓ Working: ${successCount} (${successRate}%)`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`Total time: ${totalTime}s`);
  
  console.log('\nBackend distribution:');
  for (const [backend, count] of Object.entries(results.backends).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / successCount) * 100).toFixed(1);
    console.log(`  ${backend}: ${count} (${pct}%)`);
  }
  
  if (results.failed.length > 0 && results.failed.length <= 50) {
    console.log('\n' + '='.repeat(70));
    console.log('FAILED CHANNELS');
    console.log('='.repeat(70));
    for (const f of results.failed) {
      console.log(`  Channel ${f.channel}: ${f.error}`);
    }
  } else if (results.failed.length > 50) {
    console.log('\n' + '='.repeat(70));
    console.log(`FAILED CHANNELS (showing first 50 of ${results.failed.length})`);
    console.log('='.repeat(70));
    for (const f of results.failed.slice(0, 50)) {
      console.log(`  Channel ${f.channel}: ${f.error}`);
    }
  }
  
  // Calculate average response time
  const successWithTime = results.success.filter(r => r.elapsed);
  if (successWithTime.length > 0) {
    const avgTime = successWithTime.reduce((sum, r) => sum + r.elapsed, 0) / successWithTime.length;
    console.log(`\nAverage response time: ${Math.round(avgTime)}ms`);
    
    // Find fastest and slowest
    const sorted = [...successWithTime].sort((a, b) => a.elapsed - b.elapsed);
    console.log(`Fastest: Channel ${sorted[0].channel} (${sorted[0].elapsed}ms)`);
    console.log(`Slowest: Channel ${sorted[sorted.length - 1].channel} (${sorted[sorted.length - 1].elapsed}ms)`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  if (successRate >= 95) {
    console.log('✓ EXCELLENT: ' + successRate + '% of channels working!');
  } else if (successRate >= 80) {
    console.log('⚠ GOOD: ' + successRate + '% of channels working');
  } else if (successRate >= 50) {
    console.log('⚠ WARNING: Only ' + successRate + '% of channels working');
  } else {
    console.log('✗ CRITICAL: Only ' + successRate + '% of channels working!');
  }
  console.log('='.repeat(70));
  
  // Exit with error if too many failures
  if (failCount > total * 0.2) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
