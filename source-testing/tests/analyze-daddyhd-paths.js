#!/usr/bin/env node
/**
 * Analyze daddyhd.com URL path variants for channel streams
 * Tests: stream, cast, watch, plus, casting, player
 */

const CHANNEL = process.argv[2] || '51';

const PATH_VARIANTS = [
  'stream',
  'cast', 
  'watch',
  'plus',
  'casting',
  'player'
];

async function testPath(path, channel) {
  const url = `https://daddyhd.com/${path}/stream-${channel}.php`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      redirect: 'follow'
    });
    
    const text = await response.text();
    const hasIframe = text.includes('<iframe');
    const iframeSrc = text.match(/iframe[^>]*src=["']([^"']+)["']/i)?.[1];
    const hasPlayer = text.includes('epicplayplay') || text.includes('player');
    
    return {
      path,
      url,
      status: response.status,
      redirected: response.redirected,
      finalUrl: response.url,
      hasIframe,
      iframeSrc,
      hasPlayer,
      contentLength: text.length,
      preview: text.substring(0, 200).replace(/\s+/g, ' ')
    };
  } catch (error) {
    return {
      path,
      url,
      error: error.message
    };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log(`DADDYHD.COM PATH VARIANTS ANALYSIS - Channel ${CHANNEL}`);
  console.log('='.repeat(80));
  console.log('');
  
  const results = [];
  
  for (const path of PATH_VARIANTS) {
    console.log(`Testing /${path}/stream-${CHANNEL}.php ...`);
    const result = await testPath(path, CHANNEL);
    results.push(result);
    
    if (result.error) {
      console.log(`  ❌ Error: ${result.error}`);
    } else {
      console.log(`  Status: ${result.status}`);
      console.log(`  Has iframe: ${result.hasIframe}`);
      if (result.iframeSrc) {
        console.log(`  Iframe src: ${result.iframeSrc}`);
      }
      console.log(`  Content length: ${result.contentLength}`);
    }
    console.log('');
  }
  
  // Also test the watch.php?id= format
  console.log(`Testing /watch.php?id=${CHANNEL} ...`);
  const watchResult = await testPath(`watch.php?id=${CHANNEL}`.replace(`/stream-${CHANNEL}.php`, ''), CHANNEL);
  
  const watchUrl = `https://daddyhd.com/watch.php?id=${CHANNEL}`;
  try {
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      }
    });
    const text = await response.text();
    const iframeSrc = text.match(/iframe[^>]*src=["']([^"']+)["']/i)?.[1];
    console.log(`  Status: ${response.status}`);
    console.log(`  Iframe src: ${iframeSrc || 'none'}`);
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const working = results.filter(r => !r.error && r.status === 200 && r.hasIframe);
  console.log(`\nWorking paths (${working.length}/${results.length}):`);
  working.forEach(r => {
    console.log(`  ✅ /${r.path}/stream-{id}.php`);
    if (r.iframeSrc) console.log(`     → ${r.iframeSrc}`);
  });
  
  const notWorking = results.filter(r => r.error || r.status !== 200 || !r.hasIframe);
  if (notWorking.length > 0) {
    console.log(`\nNot working (${notWorking.length}):`);
    notWorking.forEach(r => {
      console.log(`  ❌ /${r.path}/stream-{id}.php - ${r.error || `status ${r.status}`}`);
    });
  }
}

main().catch(console.error);
