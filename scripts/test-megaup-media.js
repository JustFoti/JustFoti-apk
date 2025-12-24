#!/usr/bin/env node
/**
 * Test MegaUp /media/ endpoint
 */

const embedUrl = 'https://megaup22.online/e/jIrrLzj-WS2JcOLzF79O5xvpCQ';
const videoId = 'jIrrLzj-WS2JcOLzF79O5xvpCQ';
const baseUrl = 'https://megaup22.online';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function tryEndpoint(url, name) {
  console.log(`\n=== ${name} ===`);
  console.log('URL:', url);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Referer': embedUrl,
      },
      redirect: 'manual',
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 302 || response.status === 301) {
      console.log('Redirect to:', response.headers.get('location'));
    } else if (response.ok) {
      const text = await response.text();
      console.log('Body preview:', text.substring(0, 500));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

async function main() {
  // Try various endpoints
  await tryEndpoint(`${baseUrl}/media/${videoId}`, 'media endpoint');
  await tryEndpoint(`${baseUrl}/api/source/${videoId}`, 'api source');
  await tryEndpoint(`${baseUrl}/stream/${videoId}`, 'stream');
  await tryEndpoint(`${baseUrl}/v/${videoId}`, 'v endpoint');
  await tryEndpoint(`${baseUrl}/video/${videoId}`, 'video');
  
  // Try with POST
  console.log('\n=== POST to /media/ ===');
  try {
    const response = await fetch(`${baseUrl}/media/${videoId}`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Referer': embedUrl,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: videoId }),
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body:', text.substring(0, 500));
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
