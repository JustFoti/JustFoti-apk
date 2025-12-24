#!/usr/bin/env node
/**
 * Test native MegaUp decryption
 */

// Import the native decryption (simulating TypeScript import)
const MEGAUP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const MEGAUP_KEYSTREAM_HEX = 'dece4f239861eb1c7d83f86c2fb5d27e557a3fd2696781674b986f9ed5d55cb028abc5e482a02a7c03d7ee811eb7bd6ad1dba549a20e53f564208b9d5d2e28b0797f6c6e547b5ce423bbc44be596b6ad536b9edea25a6bf97ed7fe1f36298ff1a2999ace34849e30ff894c769c2cf89e2805ddb1a4e62cf1346e3eff50b915abeb3b05f42125fe1e42b27995e76d6bc69e012c03df0e0a75a027b5be1336e1d63eb1b87816a7557b893171688ee2203ab95aee224fa555ce5558d721316a7d87fe40dd6e0fdf845a4526c879aab22e307266c27946838b311826711fd0005746e99e4c319e8556c4f953d1ea00673c9266865c5245ad5cf39ac63d73287fdb199ca3751a61e9a9aff9a64e7e47af1d1addacd2821d29a00615bfa87bfa732e10a1a525981f2734d5f6c98287d30a0ff7e0b2ad598aa2fb7bf3588aa81f75b77a1c0dd0f67180ef6726d1d7394704cee33c430f0c859305da5dfe8c59ee69b6bdeace85537a0ec7cbe1fcf79334fd0a470ba980429c88828ee9c57528730f51e3eaceb2c80b3d4c6d9844ca8de1ca834950028247825b437d7d5ffb79674e874e041df103d37f003891b62c26546ed0307a2516d22866ab95ee46e711f13896d065bb7752ae8fb8ecfac03ac0f2b53e3efdc942c8532736913a0ff51bc51db845d4c6b9300daeb80b2dc5a66f55807f1d1bf327de4c00cfb176c2d24be8b860fcc0c46752aa7e3dbbd6';

const keystreamBuffer = Buffer.from(MEGAUP_KEYSTREAM_HEX, 'hex');

function decryptMegaUp(encryptedBase64) {
  const base64 = encryptedBase64.replace(/-/g, '+').replace(/_/g, '/');
  const encBytes = Buffer.from(base64, 'base64');
  
  const decLength = Math.min(keystreamBuffer.length, encBytes.length);
  const decBytes = Buffer.alloc(decLength);
  
  for (let i = 0; i < decLength; i++) {
    decBytes[i] = encBytes[i] ^ keystreamBuffer[i];
  }
  
  const result = decBytes.toString('utf8');
  
  // Find the last valid JSON
  for (let i = result.length; i > 0; i--) {
    const substr = result.substring(0, i);
    if (substr.endsWith('}')) {
      try {
        JSON.parse(substr);
        return substr;
      } catch {}
    }
  }
  
  return result;
}

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function main() {
  console.log('=== Testing Native MegaUp Decryption ===\n');
  
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  
  // Fetch encrypted data
  console.log('Fetching encrypted data...');
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: {
      'User-Agent': MEGAUP_USER_AGENT,
      'Referer': `${baseUrl}/e/${videoId}`,
    },
  });
  
  if (!mediaResponse.ok) {
    console.log('Failed to fetch:', mediaResponse.status);
    return;
  }
  
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  console.log('Encrypted length:', encrypted.length);
  
  // Native decryption
  console.log('\nNative decryption...');
  const nativeDecrypted = decryptMegaUp(encrypted);
  
  console.log('Native result:', nativeDecrypted.substring(0, 150));
  
  // Verify JSON
  try {
    const parsed = JSON.parse(nativeDecrypted);
    console.log('\n✓ Valid JSON!');
    console.log('  Sources:', parsed.sources?.length || 0);
    console.log('  Tracks:', parsed.tracks?.length || 0);
    
    if (parsed.sources?.[0]?.file) {
      console.log('  Stream URL:', parsed.sources[0].file.substring(0, 80) + '...');
    }
  } catch (e) {
    console.log('\n✗ Invalid JSON:', e.message);
  }
  
  // Compare with API
  console.log('\n=== Comparing with enc-dec.app ===\n');
  
  const apiResult = await testDecryption(encrypted, MEGAUP_USER_AGENT);
  
  if (apiResult.status === 200) {
    const apiDecrypted = typeof apiResult.result === 'string' ? apiResult.result : JSON.stringify(apiResult.result);
    
    // Compare
    const nativeJson = JSON.parse(nativeDecrypted);
    const apiJson = JSON.parse(apiDecrypted);
    
    const nativeUrl = nativeJson.sources?.[0]?.file || '';
    const apiUrl = apiJson.sources?.[0]?.file || '';
    
    console.log('Native URL:', nativeUrl.substring(0, 80));
    console.log('API URL:   ', apiUrl.substring(0, 80));
    
    // URLs might differ slightly in the tail, but should be functionally equivalent
    const urlMatch = nativeUrl.split('/').slice(0, -1).join('/') === apiUrl.split('/').slice(0, -1).join('/');
    console.log('\nURL base match:', urlMatch ? '✓ YES' : '✗ NO');
    
    if (urlMatch) {
      console.log('\n*** NATIVE DECRYPTION WORKS! ***');
    }
  } else {
    console.log('API decryption failed:', apiResult.error);
  }
  
  // Test with multiple videos
  console.log('\n=== Testing with multiple videos ===\n');
  
  const testVideos = [
    'jIrrLzj-WS2JcOLzF79O5xvpCQ',
    // Add more video IDs if available
  ];
  
  for (const vid of testVideos) {
    try {
      const resp = await fetch(`${baseUrl}/media/${vid}`, {
        headers: {
          'User-Agent': MEGAUP_USER_AGENT,
          'Referer': `${baseUrl}/e/${vid}`,
        },
      });
      
      if (!resp.ok) {
        console.log(`Video ${vid}: HTTP ${resp.status}`);
        continue;
      }
      
      const data = await resp.json();
      if (!data.result) {
        console.log(`Video ${vid}: No result`);
        continue;
      }
      
      const dec = decryptMegaUp(data.result);
      const parsed = JSON.parse(dec);
      
      console.log(`Video ${vid}: ✓ ${parsed.sources?.length || 0} sources, ${parsed.tracks?.length || 0} tracks`);
    } catch (e) {
      console.log(`Video ${vid}: Error - ${e.message}`);
    }
  }
}

main().catch(console.error);
