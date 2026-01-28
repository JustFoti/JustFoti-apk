/**
 * Scrape DLHD.link 24/7 channels page and validate our mapping
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DLHD_URL = 'https://dlhd.link/24-7-channels.php';
const PROXY_URL = 'https://media-proxy.vynx.workers.dev/tv';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    };
    
    https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function testChannel(channelId, timeout = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const start = Date.now();
    const res = await fetch(`${PROXY_URL}?channel=${channelId}`, {
      headers: {
        'Origin': 'https://flyx.tv',
        'Referer': 'https://flyx.tv/'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}`, elapsed };
    }
    
    const text = await res.text();
    const backend = res.headers.get('x-dlhd-backend') || 'unknown';
    
    if (text.includes('#EXTM3U')) {
      return { success: true, backend, elapsed };
    } else {
      return { success: false, error: 'Invalid M3U8', elapsed };
    }
  } catch (e) {
    clearTimeout(timeoutId);
    return { success: false, error: e.name === 'AbortError' ? 'Timeout' : e.message };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('DLHD.LINK 24/7 CHANNEL SCRAPER & VALIDATOR');
  console.log('='.repeat(70));
  console.log('Source:', DLHD_URL);
  console.log('Proxy:', PROXY_URL);
  console.log('Time:', new Date().toISOString());
  console.log('');
  
  // Step 1: Scrape DLHD page
  console.log('Step 1: Scraping DLHD 24/7 channels page...');
  const html = await fetchPage(DLHD_URL);
  console.log(`  Downloaded ${html.length} bytes`);
  
  // Step 2: Extract all channel IDs from href="/watch.php?id=XXX"
  const channelPattern = /href="\/watch\.php\?id=(\d+)"/gi;
  const matches = [...html.matchAll(channelPattern)];
  
  // Also extract channel names from data-title attributes
  const titlePattern = /href="\/watch\.php\?id=(\d+)"[^>]*data-title="([^"]+)"/gi;
  const titleMatches = [...html.matchAll(titlePattern)];
  
  const channelNames = {};
  for (const m of titleMatches) {
    channelNames[m[1]] = m[2];
  }
  
  const channels = [...new Set(matches.map(m => m[1]))].sort((a, b) => parseInt(a) - parseInt(b));
  
  console.log(`  Found ${channels.length} unique channels on DLHD`);
  console.log(`  Channel ID range: ${channels[0]} - ${channels[channels.length - 1]}`);
  console.log('');
  
  // Step 3: Test ALL channels through our proxy
  console.log('Step 2: Testing ALL channels through our proxy...');
  console.log('');
  
  const results = {
    success: [],
    failed: [],
    backends: {}
  };
  
  const BATCH_SIZE = 20;
  const startTime = Date.now();
  
  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, i + BATCH_SIZE);
    const progress = Math.round((i / channels.length) * 100);
    
    process.stdout.write(`\r  [${progress}%] Testing channels ${i + 1}-${Math.min(i + BATCH_SIZE, channels.length)} of ${channels.length}... (${results.success.length} OK, ${results.failed.length} FAIL)`);
    
    const batchResults = await Promise.all(
      batch.map(async (ch) => {
        const result = await testChannel(ch);
        return { channel: ch, name: channelNames[ch] || `Channel ${ch}`, ...result };
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
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Results
  console.log('\n\n' + '='.repeat(70));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(70));
  
  const total = channels.length;
  const successCount = results.success.length;
  const failCount = results.failed.length;
  const successRate = ((successCount / total) * 100).toFixed(1);
  
  console.log(`\nTotal DLHD channels: ${total}`);
  console.log(`✓ Working through our proxy: ${successCount} (${successRate}%)`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`Test duration: ${totalTime}s`);
  
  console.log('\nBackend distribution:');
  for (const [backend, count] of Object.entries(results.backends).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / successCount) * 100).toFixed(1);
    console.log(`  ${backend}: ${count} (${pct}%)`);
  }
  
  // Show failed channels
  if (results.failed.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('FAILED CHANNELS');
    console.log('='.repeat(70));
    
    const showCount = Math.min(results.failed.length, 100);
    for (const f of results.failed.slice(0, showCount)) {
      console.log(`  ${f.channel}: ${f.name} - ${f.error}`);
    }
    
    if (results.failed.length > showCount) {
      console.log(`  ... and ${results.failed.length - showCount} more`);
    }
    
    // Save failed channels to file
    fs.writeFileSync('failed-channels.json', JSON.stringify(results.failed, null, 2));
    console.log('\nFailed channels saved to failed-channels.json');
  }
  
  // Calculate stats
  if (results.success.length > 0) {
    const times = results.success.filter(r => r.elapsed).map(r => r.elapsed);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`\nResponse times: avg=${Math.round(avgTime)}ms, min=${minTime}ms, max=${maxTime}ms`);
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(70));
  if (successRate >= 95) {
    console.log(`✓ EXCELLENT: ${successRate}% of DLHD channels working!`);
  } else if (successRate >= 80) {
    console.log(`⚠ GOOD: ${successRate}% of DLHD channels working`);
  } else if (successRate >= 50) {
    console.log(`⚠ WARNING: Only ${successRate}% of DLHD channels working`);
  } else {
    console.log(`✗ CRITICAL: Only ${successRate}% of DLHD channels working!`);
  }
  console.log('='.repeat(70));
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
