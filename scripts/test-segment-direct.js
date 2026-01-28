/**
 * Test if segments can be fetched directly from CF Worker
 * vs needing RPI proxy
 * 
 * SECURITY NOTES:
 * - This is a LOCAL TEST SCRIPT only - not for production use
 * - Do not commit real session tokens or segment URLs
 * - Rate limit: wait between requests to avoid triggering upstream protection
 * - Results may vary based on IP type (residential vs datacenter)
 */

// Rate limiting between requests (ms)
const REQUEST_DELAY_MS = 1000;

async function testSegmentFetch(url, name, referer = 'https://topembed.pw/') {
  console.log(`\nTesting ${name}:`);
  // SECURITY: Only log truncated URL to avoid exposing tokens
  console.log(`  URL: ${url.substring(0, 60)}...[truncated]`);
  
  try {
    const start = Date.now();
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
      },
      signal: AbortSignal.timeout(10000),
    });
    
    const elapsed = Date.now() - start;
    const data = await res.arrayBuffer();
    const firstByte = new Uint8Array(data)[0];
    
    console.log(`  Status: ${res.status}, Size: ${data.byteLength}, First byte: 0x${firstByte.toString(16).padStart(2, '0')} (${elapsed}ms)`);
    
    // Check for TS segment (sync byte 0x47)
    if (firstByte === 0x47) {
      console.log(`  ✅ Valid TS segment`);
      return { success: true, type: 'ts', size: data.byteLength };
    }
    
    // Check for fMP4 segment
    if (data.byteLength > 100) {
      const text = new TextDecoder().decode(data.slice(0, 100));
      if (text.includes('ftyp') || text.includes('moof')) {
        console.log(`  ✅ Valid fMP4 segment`);
        return { success: true, type: 'fmp4', size: data.byteLength };
      }
      
      // Check for error response
      if (text.startsWith('{') || text.includes('error') || text.includes('denied')) {
        console.log(`  ❌ Error response: ${text.substring(0, 80)}`);
        return { success: false, error: 'upstream_error', response: text.substring(0, 100) };
      }
    }
    
    console.log(`  ❌ Invalid segment (unknown format)`);
    return { success: false, error: 'invalid_format' };
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('SEGMENT DIRECT FETCH TEST');
  console.log('Testing if segments can be fetched without RPI proxy');
  console.log('='.repeat(60));
  
  // NOTE: These are EXAMPLE URLs - replace with fresh URLs from a live test
  // Stale segment URLs will return 404 or 403
  
  const testCases = [
    {
      // PLACEHOLDER: Replace with a fresh dvalna.ru segment URL from a live stream
      // Get this by: 1) Fetch M3U8 from CF worker, 2) Extract segment URL
      url: process.env.TEST_DVALNA_SEGMENT || 'https://chevy.dvalna.ru/PLACEHOLDER_SEGMENT_PATH',
      name: 'dvalna.ru segment (direct)',
      referer: 'https://topembed.pw/',
    },
    {
      // PLACEHOLDER: Replace with a fresh cdn-live-tv.ru segment URL
      url: process.env.TEST_CDNLIVE_SEGMENT || 'https://edge.cdn-live-tv.ru/api/v1/channels/gb-sky-sports-football/tracks-v1/PLACEHOLDER',
      name: 'cdn-live-tv.ru segment (direct)',
      referer: 'https://ddyplayer.cfd/',
    },
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testSegmentFetch(testCase.url, testCase.name, testCase.referer);
    results.push({ ...testCase, ...result });
    
    // Rate limit between requests
    await sleep(REQUEST_DELAY_MS);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Successful: ${successful.length}/${results.length}`);
  console.log(`Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\nFailed tests:');
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
  }
  
  console.log('\nNOTE: Datacenter IPs are often blocked by upstream CDNs.');
  console.log('Use RPI proxy for production segment fetching.');
}

main().catch(console.error);
