#!/usr/bin/env node
/**
 * Test MegaUp decoding with enc-dec.app
 */

const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
const baseUrl = 'https://megaup22.online';

async function main() {
  // First fetch the /media/ endpoint with a specific UA
  const testUAs = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  ];
  
  for (const ua of testUAs) {
    console.log('\n=== Testing with UA:', ua.substring(0, 50) + '... ===');
    
    // Fetch /media/ endpoint
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: {
        'User-Agent': ua,
        'Referer': `${baseUrl}/e/${videoId}`,
      },
    });
    
    const mediaData = await mediaResponse.json();
    console.log('Media status:', mediaData.status);
    
    if (mediaData.status !== 200 || !mediaData.result) {
      console.log('No result');
      continue;
    }
    
    console.log('Encrypted result length:', mediaData.result.length);
    
    // Try to decode with enc-dec.app
    const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: mediaData.result, agent: ua }),
    });
    
    const decResult = await decResponse.json();
    console.log('Decode status:', decResult.status);
    
    if (decResult.status === 200) {
      console.log('SUCCESS! Result:', decResult.result);
      return;
    } else {
      console.log('Error:', decResult.error);
    }
  }
  
  // Try with the Chrome 137 UA that the page sets
  console.log('\n=== Trying with page-set UA ===');
  const pageUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
  
  const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
    headers: {
      'User-Agent': pageUA,
      'Referer': `${baseUrl}/e/${videoId}`,
    },
  });
  
  const mediaData = await mediaResponse.json();
  console.log('Media result:', mediaData.result?.substring(0, 100));
  
  // The page sets var ua = '...' which is used for decryption
  // We need to use the SAME UA for both fetching and decrypting
  const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: mediaData.result, agent: pageUA }),
  });
  
  const decResult = await decResponse.json();
  console.log('Decode status:', decResult.status);
  console.log('Result:', decResult.result || decResult.error);
}

main().catch(console.error);
