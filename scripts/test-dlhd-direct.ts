/**
 * Test DLHD CDN Direct Access
 * 
 * Tests if we can fetch from giokko.ru CDN without a residential proxy.
 * Run: npx ts-node scripts/test-dlhd-direct.ts
 */

const PLAYER_DOMAINS = ['epicplayplay.cfd', 'daddyhd.com'];
const TEST_CHANNEL = '325'; // ESPN

async function getServerKey(channelKey: string): Promise<string> {
  for (const domain of PLAYER_DOMAINS) {
    const lookupUrl = `https://${domain}/server_lookup.js?channel_id=${channelKey}`;
    try {
      console.log(`Trying server lookup: ${domain}`);
      const response = await fetch(lookupUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': `https://${domain}/`,
          'Origin': `https://${domain}`,
        },
      });

      if (response.ok) {
        const data = await response.json() as { server_key?: string };
        if (data.server_key) {
          console.log(`✓ Server key found: ${data.server_key} from ${domain}`);
          return data.server_key;
        }
      }
    } catch (err) {
      console.log(`✗ ${domain} failed:`, (err as Error).message);
    }
  }
  throw new Error('All server lookups failed');
}

async function testDirectFetch(serverKey: string, channelKey: string): Promise<void> {
  const m3u8Url = `https://${serverKey}new.giokko.ru/${serverKey}/${channelKey}/mono.css`;
  
  console.log(`\nTesting direct fetch to: ${m3u8Url}`);
  
  // Test 1: No headers
  console.log('\n--- Test 1: No special headers ---');
  try {
    const res1 = await fetch(m3u8Url);
    console.log(`Status: ${res1.status}`);
    if (res1.ok) {
      const text = await res1.text();
      console.log(`✓ SUCCESS! Content length: ${text.length}`);
      console.log(`Preview: ${text.substring(0, 200)}`);
    } else {
      console.log(`✗ Failed: ${res1.statusText}`);
    }
  } catch (err) {
    console.log(`✗ Error: ${(err as Error).message}`);
  }

  // Test 2: With Referer header
  console.log('\n--- Test 2: With Referer header ---');
  try {
    const res2 = await fetch(m3u8Url, {
      headers: {
        'Referer': 'https://epicplayplay.cfd/',
      },
    });
    console.log(`Status: ${res2.status}`);
    if (res2.ok) {
      const text = await res2.text();
      console.log(`✓ SUCCESS! Content length: ${text.length}`);
    } else {
      console.log(`✗ Failed: ${res2.statusText}`);
    }
  } catch (err) {
    console.log(`✗ Error: ${(err as Error).message}`);
  }

  // Test 3: With full browser headers
  console.log('\n--- Test 3: Full browser headers ---');
  try {
    const res3 = await fetch(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://epicplayplay.cfd/',
        'Origin': 'https://epicplayplay.cfd',
      },
    });
    console.log(`Status: ${res3.status}`);
    if (res3.ok) {
      const text = await res3.text();
      console.log(`✓ SUCCESS! Content length: ${text.length}`);
      console.log(`Is valid M3U8: ${text.includes('#EXTM3U')}`);
    } else {
      console.log(`✗ Failed: ${res3.statusText}`);
      const text = await res3.text();
      console.log(`Response: ${text.substring(0, 500)}`);
    }
  } catch (err) {
    console.log(`✗ Error: ${(err as Error).message}`);
  }
}

async function main() {
  console.log('=== DLHD Direct Access Test ===\n');
  console.log('This tests if we can fetch from giokko.ru without a residential proxy.\n');
  
  const channelKey = `premium${TEST_CHANNEL}`;
  
  try {
    const serverKey = await getServerKey(channelKey);
    await testDirectFetch(serverKey, channelKey);
  } catch (err) {
    console.error('Test failed:', err);
  }
  
  console.log('\n=== Test Complete ===');
  console.log('\nIf Test 3 succeeded, direct fetch works and no residential proxy is needed!');
  console.log('If all tests failed with 403/blocked, the CDN is blocking based on IP.');
}

main();
