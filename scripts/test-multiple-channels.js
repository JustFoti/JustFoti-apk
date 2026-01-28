/**
 * Test multiple channels on the deployed worker
 */

const testChannels = ['35', '44', '51', '31', '32', '38', '60', '130'];

async function testChannel(id) {
  try {
    const res = await fetch(`https://media-proxy.vynx.workers.dev/tv?channel=${id}`, {
      headers: {
        'Origin': 'https://tv.vynx.cc',
        'Referer': 'https://tv.vynx.cc/'
      }
    });
    
    if (res.status !== 200) {
      const text = await res.text();
      return { id, status: 'FAILED', error: text.substring(0, 100) };
    }
    
    const text = await res.text();
    if (!text.includes('#EXTM3U')) {
      return { id, status: 'FAILED', error: 'Not M3U8' };
    }
    
    const backend = res.headers.get('x-dlhd-backend');
    const server = res.headers.get('x-dlhd-server');
    const channelKey = res.headers.get('x-dlhd-channelkey');
    
    // Test key fetch
    const keyMatch = text.match(/URI="([^"]+)"/);
    if (keyMatch) {
      const keyRes = await fetch(keyMatch[1], {
        headers: {
          'Origin': 'https://tv.vynx.cc',
          'Referer': 'https://tv.vynx.cc/'
        }
      });
      
      const keyData = await keyRes.arrayBuffer();
      if (keyData.byteLength === 16) {
        return { id, status: 'OK', backend, server, channelKey, keyOk: true };
      } else {
        const keyText = new TextDecoder().decode(keyData);
        return { id, status: 'KEY_FAILED', backend, server, channelKey, keyError: keyText.substring(0, 50) };
      }
    }
    
    return { id, status: 'OK', backend, server, channelKey, keyOk: 'no-key-url' };
  } catch (e) {
    return { id, status: 'ERROR', error: e.message };
  }
}

async function main() {
  console.log('Testing Multiple Channels');
  console.log('=========================\n');
  
  for (const id of testChannels) {
    const result = await testChannel(id);
    const statusIcon = result.status === 'OK' && result.keyOk === true ? '✅' : '❌';
    console.log(`${statusIcon} Channel ${id.padStart(3)}: ${result.status} | ${result.backend || '-'} | ${result.server || '-'} | ${result.channelKey || '-'} | key: ${result.keyOk || result.keyError || '-'}`);
  }
}

main().catch(console.error);
