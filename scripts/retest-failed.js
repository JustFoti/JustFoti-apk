/**
 * Retest failed channels with longer timeout
 */

const fs = require('fs');
const PROXY_URL = 'https://media-proxy.vynx.workers.dev/tv';

async function testChannel(channelId, timeout = 45000) {
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
  const failed = JSON.parse(fs.readFileSync('failed-channels.json', 'utf8'));
  
  console.log('Retesting', failed.length, 'failed channels with 45s timeout...\n');
  
  const results = { fixed: [], stillFailed: [] };
  
  for (let i = 0; i < failed.length; i++) {
    const ch = failed[i];
    process.stdout.write(`\r[${i + 1}/${failed.length}] Testing channel ${ch.channel}...`);
    
    const result = await testChannel(ch.channel);
    
    if (result.success) {
      results.fixed.push({ ...ch, backend: result.backend, elapsed: result.elapsed });
    } else {
      results.stillFailed.push({ ...ch, newError: result.error });
    }
  }
  
  console.log('\n\n=== RESULTS ===');
  console.log('Fixed:', results.fixed.length);
  console.log('Still failed:', results.stillFailed.length);
  
  if (results.fixed.length > 0) {
    console.log('\nFixed channels:');
    results.fixed.forEach(f => console.log(`  ${f.channel}: ${f.name} (${f.backend}, ${f.elapsed}ms)`));
  }
  
  if (results.stillFailed.length > 0) {
    console.log('\nStill failing:');
    results.stillFailed.forEach(f => console.log(`  ${f.channel}: ${f.name} - ${f.newError}`));
  }
  
  // Calculate new success rate
  const totalChannels = 899;
  const originalSuccess = 623;
  const newSuccess = originalSuccess + results.fixed.length;
  const newRate = ((newSuccess / totalChannels) * 100).toFixed(1);
  
  console.log(`\nNew success rate: ${newSuccess}/${totalChannels} (${newRate}%)`);
}

main().catch(console.error);
