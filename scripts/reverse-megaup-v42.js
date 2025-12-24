#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v42
 * 
 * Test the complete native decryption solution.
 * We'll use a fixed UA and the corresponding keystream.
 */

const MEGAUP_KEYSTREAM = Buffer.from('dece4f239861eb1c7d83f86c2fb5d27e557a3fd2696781674b986f9ed5d55cb028abc5e482a02a7c03d7ee811eb7bd6ad1dba549a20e53f564208b9d5d2e28b0797f6c6e547b5ce423bbc44be596b6ad536b9edea25a6bf97ed7fe1f36298ff1a2999ace34849e30ff894c769c2cf89e2805ddb1a4e62cf1346e3eff50b915abeb3b05f42125fe1e42b27995e76d6bc69e012c03df0e0a75a027b5be1336e1d63eb1b87816a7557b893171688ee2203ab95aee224fa555ce5558d721316a7d87fe40dd6e0fdf845a4526c879aab22e307266c27946838b311826711fd0005746e99e4c319e8556c4f953d1ea00673c9266865c5245ad5cf39ac63d73287fdb199ca3751a61e9a9aff9a64e7e47af1d1addacd2821d29a00615bfa87bfa732e10a1a525981f2734d5f6c98287d30a0ff7e0b2ad598aa2fb7bf3588aa81f75b77a1c0dd0f67180ef6726d1d7394704cee33c430f0c859305da5dfe8c59ee69b6bdeace85537a0ec7cbe1fcf79334fd0a470ba980429c88828ee9c57528730f51e3eaceb2c80b3d4c6d9844ca8de1ca834950028247825b437d7d5ffb79674e874e041df103d37f003891b62c26546ed0307a2516d22866ab95ee46e711f13896d065bb7752ae8fb8ecfac03ac0f2b53e3efdc942c8532736913a0ff51bc51db845d4c6b9300daeb80b2dc5a66f55807f1d1bf327de4c00cfb176c2d24be8b860fcc0c46756b87e2dbbd6', 'hex');

const MEGAUP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function decryptMegaUp(encryptedBase64) {
  // Convert from URL-safe base64
  const base64 = encryptedBase64.replace(/-/g, '+').replace(/_/g, '/');
  const encBytes = Buffer.from(base64, 'base64');
  
  // XOR with keystream
  const decBytes = Buffer.alloc(Math.min(MEGAUP_KEYSTREAM.length, encBytes.length));
  for (let i = 0; i < decBytes.length; i++) {
    decBytes[i] = encBytes[i] ^ MEGAUP_KEYSTREAM[i];
  }
  
  return decBytes.toString('utf8');
}

async function main() {
  const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
  const baseUrl = 'https://megaup22.online';
  
  console.log('=== Testing native MegaUp decryption ===\n');
  
  // Fetch encrypted data using our fixed UA
  console.log('Fetching encrypted data with fixed UA...');
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: { 
      'User-Agent': MEGAUP_UA, 
      'Referer': `${baseUrl}/e/${videoId}` 
    },
  });
  
  if (!mediaResponse.ok) {
    console.log('Failed to fetch:', mediaResponse.status);
    return;
  }
  
  const mediaData = await mediaResponse.json();
  const encrypted = mediaData.result;
  
  console.log('Encrypted length:', encrypted.length);
  
  // Decrypt natively
  console.log('\nDecrypting natively...');
  const decrypted = decryptMegaUp(encrypted);
  
  console.log('Decrypted length:', decrypted.length);
  console.log('Decrypted:', decrypted.substring(0, 200));
  
  // Verify it's valid JSON
  try {
    const parsed = JSON.parse(decrypted);
    console.log('\n✓ Valid JSON!');
    console.log('Sources:', parsed.sources?.length || 0);
    console.log('Tracks:', parsed.tracks?.length || 0);
    
    if (parsed.sources?.[0]?.file) {
      console.log('\nFirst source URL:', parsed.sources[0].file.substring(0, 80) + '...');
    }
  } catch (e) {
    console.log('\n✗ Invalid JSON:', e.message);
    
    // Try to find where it goes wrong
    for (let i = decrypted.length; i > 0; i--) {
      try {
        JSON.parse(decrypted.substring(0, i));
        console.log(`Valid up to position ${i}`);
        break;
      } catch {}
    }
  }
  
  // Compare with API decryption
  console.log('\n=== Comparing with API decryption ===\n');
  
  const apiResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent: MEGAUP_UA }),
  });
  const apiResult = await apiResponse.json();
  
  if (apiResult.status === 200) {
    const apiDecrypted = typeof apiResult.result === 'string' ? apiResult.result : JSON.stringify(apiResult.result);
    
    console.log('API decrypted length:', apiDecrypted.length);
    
    // Compare byte by byte
    let matches = 0;
    let firstMismatch = -1;
    for (let i = 0; i < Math.min(decrypted.length, apiDecrypted.length); i++) {
      if (decrypted[i] === apiDecrypted[i]) {
        matches++;
      } else if (firstMismatch === -1) {
        firstMismatch = i;
      }
    }
    
    console.log(`Match: ${matches}/${apiDecrypted.length} (${(matches/apiDecrypted.length*100).toFixed(1)}%)`);
    
    if (firstMismatch !== -1) {
      console.log(`First mismatch at position ${firstMismatch}:`);
      console.log(`  Native: "${decrypted.substring(firstMismatch, firstMismatch + 20)}"`);
      console.log(`  API:    "${apiDecrypted.substring(firstMismatch, firstMismatch + 20)}"`);
    }
    
    if (matches === apiDecrypted.length) {
      console.log('\n*** PERFECT MATCH! Native decryption works! ***');
    }
  } else {
    console.log('API decryption failed:', apiResult.error);
  }
  
  // Test with a different video
  console.log('\n=== Testing with different video ===\n');
  
  const videoId2 = 'test123'; // This might not exist, but let's try
  const mediaResponse2 = await fetch(`${baseUrl}/media/${videoId2}`, {
    headers: { 
      'User-Agent': MEGAUP_UA, 
      'Referer': `${baseUrl}/e/${videoId2}` 
    },
  });
  
  if (mediaResponse2.ok) {
    const mediaData2 = await mediaResponse2.json();
    if (mediaData2.result) {
      const decrypted2 = decryptMegaUp(mediaData2.result);
      console.log('Video 2 decrypted:', decrypted2.substring(0, 100));
    } else {
      console.log('Video 2: No result');
    }
  } else {
    console.log('Video 2: HTTP', mediaResponse2.status);
  }
}

main().catch(console.error);
