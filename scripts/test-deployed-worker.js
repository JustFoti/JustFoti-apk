/**
 * Test the deployed CF worker to see what's happening
 */

async function testWorker() {
  console.log('Testing Deployed CF Worker');
  console.log('===========================\n');
  
  // Test health endpoint
  console.log('1. Testing health endpoint...');
  try {
    const healthRes = await fetch('https://media-proxy.vynx.workers.dev/tv/health');
    const health = await healthRes.json();
    console.log('   Health:', JSON.stringify(health, null, 2));
  } catch (e) {
    console.log('   Health check failed:', e.message);
  }
  
  // Test channel 35
  console.log('\n2. Testing channel 35...');
  try {
    const channelRes = await fetch('https://media-proxy.vynx.workers.dev/tv?channel=35', {
      headers: {
        'Origin': 'https://tv.vynx.cc',
        'Referer': 'https://tv.vynx.cc/'
      }
    });
    
    console.log('   Status:', channelRes.status);
    console.log('   Headers:', Object.fromEntries(channelRes.headers.entries()));
    
    const text = await channelRes.text();
    if (text.includes('#EXTM3U')) {
      console.log('   M3U8 SUCCESS! Length:', text.length);
      console.log('   Preview:', text.substring(0, 500));
      
      // Extract key URL
      const keyMatch = text.match(/URI="([^"]+)"/);
      if (keyMatch) {
        console.log('\n3. Testing key fetch...');
        const keyUrl = keyMatch[1];
        console.log('   Key URL:', keyUrl);
        
        const keyRes = await fetch(keyUrl, {
          headers: {
            'Origin': 'https://tv.vynx.cc',
            'Referer': 'https://tv.vynx.cc/'
          }
        });
        
        console.log('   Key Status:', keyRes.status);
        const keyData = await keyRes.arrayBuffer();
        console.log('   Key Size:', keyData.byteLength);
        
        if (keyData.byteLength === 16) {
          console.log('   KEY SUCCESS:', Buffer.from(keyData).toString('hex'));
        } else {
          const keyText = new TextDecoder().decode(keyData);
          console.log('   Key Response:', keyText.substring(0, 300));
        }
      }
    } else {
      console.log('   Response:', text.substring(0, 500));
    }
  } catch (e) {
    console.log('   Channel test failed:', e.message);
  }
}

testWorker().catch(console.error);
