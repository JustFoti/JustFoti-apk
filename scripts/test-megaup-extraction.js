#!/usr/bin/env node
/**
 * Test the full MegaUp extraction flow
 */

const embedUrls = [
  'https://megaup22.online/e/jIrrLzj-WS2JcOLzF79O5xvpCQ', // Gachiakuta
  'https://megaup22.online/e/k5OoeWapWS2JcOLzF79O5xvpCQ', // Naruto
  'https://megaup.live/e/0MjhZzuwWSyJcOLzF79O5xvpCQ',     // One Piece (different domain)
];

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function extractMegaUp(embedUrl) {
  // Extract video ID and base URL
  const urlMatch = embedUrl.match(/https?:\/\/([^\/]+)\/e\/([^\/\?]+)/);
  if (!urlMatch) {
    return { success: false, error: 'Invalid URL format' };
  }
  
  const [, host, videoId] = urlMatch;
  const baseUrl = `https://${host}`;
  const mediaUrl = `${baseUrl}/media/${videoId}`;
  
  console.log(`  Fetching: ${mediaUrl}`);
  
  // Fetch /media/ endpoint
  const mediaResponse = await fetch(mediaUrl, {
    headers: {
      'User-Agent': ua,
      'Referer': embedUrl,
    },
  });
  
  if (!mediaResponse.ok) {
    return { success: false, error: `HTTP ${mediaResponse.status}` };
  }
  
  const mediaData = await mediaResponse.json();
  if (mediaData.status !== 200 || !mediaData.result) {
    return { success: false, error: 'No result from /media/' };
  }
  
  console.log(`  Got encrypted data (${mediaData.result.length} chars)`);
  
  // Decrypt with enc-dec.app
  const decResponse = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: mediaData.result, agent: ua }),
  });
  
  const decResult = await decResponse.json();
  if (decResult.status !== 200) {
    return { success: false, error: decResult.error || 'Decryption failed' };
  }
  
  // Parse result
  let streamData;
  try {
    streamData = typeof decResult.result === 'string' ? JSON.parse(decResult.result) : decResult.result;
  } catch {
    streamData = decResult.result;
  }
  
  const streamUrl = streamData.sources?.[0]?.file || streamData.file || streamData.url;
  
  if (!streamUrl) {
    return { success: false, error: 'No stream URL in decrypted data' };
  }
  
  return { success: true, streamUrl };
}

async function main() {
  console.log('Testing MegaUp extraction with enc-dec.app...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const url of embedUrls) {
    console.log(`Testing: ${url}`);
    try {
      const result = await extractMegaUp(url);
      if (result.success) {
        console.log(`  ✓ SUCCESS: ${result.streamUrl.substring(0, 80)}...\n`);
        passed++;
      } else {
        console.log(`  ✗ FAILED: ${result.error}\n`);
        failed++;
      }
    } catch (e) {
      console.log(`  ✗ ERROR: ${e.message}\n`);
      failed++;
    }
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
