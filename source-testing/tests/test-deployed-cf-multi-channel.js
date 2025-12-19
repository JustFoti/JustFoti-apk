/**
 * Test multiple channels on deployed CF Worker
 */

const CF_URL = 'https://media-proxy.vynx.workers.dev';
const CHANNELS = ['51', '325', '313', '1', '100'];

async function testChannel(channel) {
  console.log(`\n--- Testing Channel ${channel} ---`);
  
  try {
    // Fetch M3U8
    const m3u8Res = await fetch(`${CF_URL}/dlhd?channel=${channel}`);
    const m3u8Text = await m3u8Res.text();
    
    if (!m3u8Text.includes('#EXTM3U')) {
      console.log(`  ❌ M3U8 failed: ${m3u8Text.substring(0, 100)}`);
      return false;
    }
    
    console.log(`  ✅ M3U8 OK (server: ${m3u8Res.headers.get('x-dlhd-server')})`);
    
    // Extract and fetch key
    const keyMatch = m3u8Text.match(/URI="([^"]+)"/);
    if (!keyMatch) {
      console.log(`  ❌ No key URL in M3U8`);
      return false;
    }
    
    const keyRes = await fetch(keyMatch[1]);
    const keyData = await keyRes.arrayBuffer();
    
    if (keyData.byteLength === 16) {
      console.log(`  ✅ Key OK (${keyRes.headers.get('x-fetched-by') || 'unknown'})`);
      return true;
    } else {
      const keyText = new TextDecoder().decode(keyData);
      console.log(`  ❌ Key failed: ${keyData.byteLength} bytes - ${keyText.substring(0, 50)}`);
      return false;
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Testing Multiple Channels on Deployed CF Worker ===');
  console.log(`Worker: ${CF_URL}`);
  
  let passed = 0;
  for (const channel of CHANNELS) {
    if (await testChannel(channel)) passed++;
    // Small delay between channels
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n=== Results: ${passed}/${CHANNELS.length} channels passed ===`);
}

main();
