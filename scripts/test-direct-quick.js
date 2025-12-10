#!/usr/bin/env node
/**
 * Quick test of direct stream access with longer timeout
 */

const STREAM_URL = 'http://sbhgoldpro.org:80/play/live.php?mac=00:1A:79:00:00:00&stream=552828&extension=ts&play_token=test';
const MAC = '00:1A:79:00:00:00';

async function test() {
  console.log('Testing direct stream access...');
  console.log(`URL: ${STREAM_URL}\n`);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const res = await fetch(STREAM_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
        'X-User-Agent': 'Model: MAG250; Link: WiFi',
        'Accept': '*/*',
        'Cookie': `mac=${encodeURIComponent(MAC)}; stb_lang=en; timezone=GMT`,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    
    // Log all headers
    console.log('\nAll headers:');
    for (const [key, value] of res.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    if (res.ok) {
      const reader = res.body.getReader();
      const { value } = await reader.read();
      reader.cancel();
      console.log(`\n✓ Got ${value?.length || 0} bytes`);
      
      // Check if it's video data (TS packets start with 0x47)
      if (value && value[0] === 0x47) {
        console.log('✓ Valid MPEG-TS data (starts with sync byte 0x47)');
      }
    } else {
      const body = await res.text();
      console.log(`\nBody: ${body.substring(0, 500)}`);
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
    
    // Check if it's a network error vs timeout
    if (e.name === 'AbortError') {
      console.log('Request timed out after 30 seconds');
    }
  }
}

test();
