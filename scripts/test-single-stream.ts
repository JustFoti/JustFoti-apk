/**
 * QUICK SINGLE STREAM TESTER
 * Tests a single M3U8 URL with different headers to find working combinations
 */

async function testSingleStreamHeaders(url: string) {
  console.log(`🎯 TESTING SINGLE STREAM: ${url}`);
  console.log('='.repeat(80));
  
  const headerSets = [
    {
      name: 'Standard HLS',
      headers: {
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.fctv33.site/'
      }
    },
    {
      name: 'Mobile Safari',
      headers: {
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.fctv33.site/'
      }
    },
    {
      name: 'Goaloo Referer',
      headers: {
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://live6.goaloo26.com/',
        'Origin': 'https://live6.goaloo26.com'
      }
    },
    {
      name: 'FootLive Referer',
      headers: {
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.footlive.com/',
        'Origin': 'https://www.footlive.com'
      }
    },
    {
      name: 'VLC Player',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16',
        'Range': 'bytes=0-'
      }
    },
    {
      name: 'FFmpeg',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Lavf/58.76.100'
      }
    },
    {
      name: 'No Referer',
      headers: {
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    },
    {
      name: 'Direct Access',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache'
      }
    }
  ];

  for (let i = 0; i < headerSets.length; i++) {
    const headerSet = headerSets[i];
    console.log(`\n🔄 Testing ${headerSet.name} (${i + 1}/${headerSets.length})...`);
    
    try {
      const response = await fetch(url, {
        headers: headerSet.headers,
        method: 'GET'
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('content-type') || 'unknown'}`);
      console.log(`   Content-Length: ${response.headers.get('content-length') || 'unknown'}`);
      
      if (response.ok) {
        const content = await response.text();
        console.log(`   Response Size: ${content.length} bytes`);
        
        if (content.includes('#EXTM3U') || content.includes('#EXT-X-')) {
          console.log(`   ✅ SUCCESS! Valid M3U8 content found!`);
          console.log(`   🔴 Live Stream: ${!content.includes('#EXT-X-ENDLIST')}`);
          
          // Show first few lines of M3U8
          const lines = content.split('\n').slice(0, 10);
          console.log(`   📋 M3U8 Preview:`);
          lines.forEach(line => {
            if (line.trim()) console.log(`      ${line}`);
          });
          
          console.log(`\n   🎉 WORKING HEADERS:`);
          console.log(JSON.stringify(headerSet.headers, null, 4));
          
          return true;
        } else {
          console.log(`   ⚠️  Response OK but not M3U8 content`);
          console.log(`   📄 Content preview: ${content.substring(0, 200)}...`);
        }
      } else {
        console.log(`   ❌ HTTP Error: ${response.status} ${response.statusText}`);
      }
      
    } catch (error: any) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n❌ No working header combination found for: ${url}`);
  return false;
}

// Command line usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: bun run scripts/test-single-stream.ts <M3U8_URL>');
    console.log('Example: bun run scripts/test-single-stream.ts https://example.com/stream.m3u8');
    return;
  }
  
  const streamUrl = args[0];
  await testSingleStreamHeaders(streamUrl);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSingleStreamHeaders };