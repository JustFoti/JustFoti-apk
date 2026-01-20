/**
 * Test the Cloudflare Worker proxy directly
 */

async function testWorkerProxy(channelId) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing Worker Proxy for Channel ${channelId}`);
  console.log('='.repeat(80));
  
  const workerUrl = `https://media-proxy.vynx.workers.dev/dlhd?channel=${channelId}`;
  
  console.log(`\nFetching: ${workerUrl}`);
  
  try {
    const response = await fetch(workerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    const content = await response.text();
    
    if (response.ok) {
      console.log(`\n✓ Success! (${content.length} bytes)`);
      
      // Check if it's valid M3U8
      if (content.includes('#EXTM3U')) {
        console.log('✓ Valid M3U8 playlist');
        
        // Count proxied segments
        const lines = content.split('\n');
        const segmentLines = lines.filter(line => 
          line.trim() && 
          !line.startsWith('#') && 
          line.includes('http')
        );
        
        const proxied = segmentLines.filter(line => line.includes('/dlhd/segment?'));
        const notProxied = segmentLines.filter(line => !line.includes('/dlhd/segment?'));
        
        console.log(`\nSegments:`);
        console.log(`  Total: ${segmentLines.length}`);
        console.log(`  Proxied: ${proxied.length}`);
        console.log(`  Not proxied: ${notProxied.length}`);
        
        if (proxied.length > 0) {
          console.log(`\nFirst proxied segment:`);
          console.log(`  ${proxied[0].substring(0, 120)}...`);
        }
        
        if (notProxied.length > 0) {
          console.log(`\n⚠ Not proxied segments:`);
          for (const line of notProxied.slice(0, 3)) {
            console.log(`  ${line.substring(0, 100)}`);
          }
        }
        
        // Check key
        const keyMatch = content.match(/URI="([^"]+)"/);
        if (keyMatch) {
          const keyUrl = keyMatch[1];
          if (keyUrl.includes('/dlhd/key?')) {
            console.log(`\n✓ Key is proxied`);
          } else {
            console.log(`\n⚠ Key is NOT proxied: ${keyUrl}`);
          }
        }
        
      } else {
        console.log('❌ Not a valid M3U8 playlist');
        console.log('\nContent preview:');
        console.log(content.substring(0, 500));
      }
      
    } else {
      console.log(`\n❌ Error response:`);
      console.log(content);
    }
    
  } catch (error) {
    console.log(`\n❌ Fetch failed: ${error.message}`);
  }
}

async function main() {
  await testWorkerProxy('539');
  await new Promise(r => setTimeout(r, 2000));
  await testWorkerProxy('20');
}

main().catch(console.error);
