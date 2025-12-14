/**
 * Test the enc-dec.app/api/dec-mega API
 * This decrypts the encrypted data from MegaUp's /media/ endpoint
 * 
 * IMPORTANT: The User-Agent MUST be consistent across:
 * 1. RPI proxy fetching from MegaUp
 * 2. enc-dec.app decryption request
 * 
 * Run: node source-testing/tests/test-enc-dec-mega.js
 */

const ENC_DEC_API = 'https://enc-dec.app';
const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

// CRITICAL: This User-Agent MUST match what RPI proxy uses
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': USER_AGENT,
};

// Test URL - a MegaUp media endpoint
const TEST_MEGAUP_URL = 'https://megaup22.online/media/mZPgb3GwWS2JcOLzFLxC7hHpCQ';

async function testDecMega() {
  console.log('Testing enc-dec.app/api/dec-mega API...\n');
  console.log(`User-Agent: ${USER_AGENT}\n`);
  
  // Step 1: Get encrypted data from MegaUp via CF proxy
  console.log('=== Step 1: Get encrypted data from MegaUp ===');
  console.log(`Target URL: ${TEST_MEGAUP_URL}`);
  
  // Pass the User-Agent to the proxy chain so RPI uses the same one
  const proxyUrl = `${CF_PROXY_URL}/animekai?url=${encodeURIComponent(TEST_MEGAUP_URL)}&ua=${encodeURIComponent(USER_AGENT)}`;
  
  try {
    const mediaResponse = await fetch(proxyUrl);
    
    if (!mediaResponse.ok) {
      console.log(`✗ Failed to get encrypted data: HTTP ${mediaResponse.status}`);
      const errorText = await mediaResponse.text();
      console.log('Error:', errorText.substring(0, 500));
      return;
    }
    
    const mediaData = await mediaResponse.json();
    
    if (!mediaData.result) {
      console.log('✗ No result in MegaUp response');
      console.log('Response:', JSON.stringify(mediaData, null, 2));
      return;
    }
    
    const encryptedData = mediaData.result;
    console.log(`✓ Got encrypted data (${encryptedData.length} chars)`);
    console.log(`Preview: ${encryptedData.substring(0, 100)}...`);
    
    // Step 2: Decrypt with enc-dec.app
    console.log('\n=== Step 2: Decrypt with enc-dec.app ===');
    console.log(`API: ${ENC_DEC_API}/api/dec-mega`);
    
    const decryptResponse = await fetch(`${ENC_DEC_API}/api/dec-mega`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...HEADERS,
      },
      body: JSON.stringify({
        text: encryptedData,
        agent: HEADERS['User-Agent'],
      }),
    });
    
    console.log(`Status: ${decryptResponse.status}`);
    
    if (!decryptResponse.ok) {
      console.log(`✗ Decryption failed: HTTP ${decryptResponse.status}`);
      const errorText = await decryptResponse.text();
      console.log('Error:', errorText.substring(0, 500));
      return;
    }
    
    const decryptData = await decryptResponse.json();
    console.log('Response:', JSON.stringify(decryptData, null, 2));
    
    if (decryptData.result) {
      console.log('\n✓ SUCCESS!');
      
      // Parse the result
      let streamData;
      if (typeof decryptData.result === 'string') {
        try {
          streamData = JSON.parse(decryptData.result);
        } catch {
          streamData = { file: decryptData.result };
        }
      } else {
        streamData = decryptData.result;
      }
      
      console.log('Stream data:', JSON.stringify(streamData, null, 2));
      
      // Extract the m3u8 URL
      const streamUrl = streamData.file || streamData.sources?.[0]?.file;
      if (streamUrl) {
        console.log('\n🎬 STREAM URL:', streamUrl);
      }
    } else {
      console.log('\n✗ Decryption failed - no result');
      if (decryptData.error) {
        console.log('Error:', decryptData.error);
      }
      if (decryptData.hint) {
        console.log('Hint:', decryptData.hint);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDecMega();
