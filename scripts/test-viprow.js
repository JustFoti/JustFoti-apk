/**
 * VIPRow Integration Test Script
 * 
 * Tests the VIPRow schedule and stream extraction.
 * 
 * Usage: node scripts/test-viprow.js
 */

const VIPROW_BASE = 'https://www.viprow.nu';

async function testSchedule() {
  console.log('=== Testing VIPRow Schedule ===\n');
  
  const response = await fetch(`${VIPROW_BASE}/sports-big-games`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const html = await response.text();
  
  // Parse events - same pattern as the API
  const eventPattern = /href="([^"]+online-stream)"[^>]*role="button"[^>]*title="([^"]+)"[^>]*>.*?<span[^>]*class="[^"]*vipbox\s+([^"]+)"[^>]*><\/span>.*?<span[^>]*content="([^"]+)"[^>]*>(\d{2}:\d{2})<\/span>/gs;
  
  const events = [];
  let match;
  while ((match = eventPattern.exec(html)) !== null) {
    events.push({
      url: match[1],
      title: match[2],
      sport: match[3],
      isoTime: match[4],
      time: match[5]
    });
  }
  
  console.log(`Found ${events.length} events\n`);
  events.slice(0, 10).forEach(e => {
    console.log(`  ${e.time} [${e.sport}] ${e.title}`);
  });
  
  return events[0]; // Return first event for stream test
}

async function testStream(eventUrl) {
  console.log('\n=== Testing VIPRow Stream ===\n');
  console.log('Event URL:', eventUrl);
  
  // Fetch stream page (link 1)
  const streamUrl = `${VIPROW_BASE}${eventUrl}-1`;
  const response = await fetch(streamUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const html = await response.text();
  
  // Extract stream params
  const zmidMatch = html.match(/const\s+zmid\s*=\s*"([^"]+)"/);
  const pidMatch = html.match(/const\s+pid\s*=\s*(\d+)/);
  const edmMatch = html.match(/const\s+edm\s*=\s*"([^"]+)"/);
  const configMatch = html.match(/const siteConfig = (\{[^;]+\});/);
  
  if (zmidMatch && pidMatch && edmMatch && configMatch) {
    const config = JSON.parse(configMatch[1]);
    
    console.log('Stream params:');
    console.log('  zmid:', zmidMatch[1]);
    console.log('  pid:', pidMatch[1]);
    console.log('  edm:', edmMatch[1]);
    console.log('  category:', config.linkAppendUri);
    
    // Build embed URL (same logic as casthill embed.min.js)
    const params = new URLSearchParams({
      pid: pidMatch[1],
      gacat: '',
      gatxt: config.linkAppendUri,
      v: zmidMatch[1],
      csrf: config.csrf,
      csrf_ip: config.csrf_ip,
    });
    
    const embedUrl = `https://${edmMatch[1]}/sd0embed/${config.linkAppendUri}?${params}`;
    console.log('\nEmbed URL:', embedUrl);
    console.log('\nThis URL can be used in an iframe to play the stream.');
  } else {
    console.log('Could not extract stream params');
    console.log('  hasZmid:', !!zmidMatch);
    console.log('  hasPid:', !!pidMatch);
    console.log('  hasEdm:', !!edmMatch);
    console.log('  hasConfig:', !!configMatch);
  }
}

async function main() {
  try {
    const firstEvent = await testSchedule();
    if (firstEvent) {
      await testStream(firstEvent.url);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
