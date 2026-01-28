/**
 * Test DLHD Schedule API parsing
 */

async function testSchedule() {
  console.log('Testing DLHD Schedule API...\n');
  
  // Fetch from daddyhd.com directly
  const response = await fetch('https://daddyhd.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  
  const html = await response.text();
  console.log('HTML length:', html.length);
  
  // Find schedule events
  const eventRegex = /<div[^>]*class="[^"]*schedule__event(?:\s[^"]*)?[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*schedule__event(?:\s|")[^"]*"|<\/div>\s*<\/div>\s*<div[^>]*class="[^"]*schedule__category|$)/gi;
  
  let match;
  let count = 0;
  
  while ((match = eventRegex.exec(html)) !== null && count < 5) {
    const eventHtml = match[0];
    
    // Extract title
    const titleMatch = eventHtml.match(/class="[^"]*schedule__eventTitle[^"]*"[^>]*>([^<]*)</i);
    const title = titleMatch ? titleMatch[1].trim() : 'NO TITLE';
    
    // Extract time
    const timeMatch = eventHtml.match(/class="[^"]*schedule__time[^"]*"[^>]*>([^<]*)</i);
    const time = timeMatch ? timeMatch[1].trim() : 'NO TIME';
    
    // Extract channels
    const channels = [];
    const channelsSection = eventHtml.match(/class="[^"]*schedule__channels[^"]*"[^>]*>([\s\S]*?)(?:<\/div>|$)/i);
    if (channelsSection) {
      const channelRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
      let chMatch;
      while ((chMatch = channelRegex.exec(channelsSection[1])) !== null) {
        const href = chMatch[1];
        const name = chMatch[2].trim();
        const idMatch = href.match(/id=(\d+)/);
        channels.push({
          name,
          channelId: idMatch ? idMatch[1] : 'NO ID',
          href
        });
      }
    }
    
    console.log(`\n=== Event ${++count} ===`);
    console.log('Title:', title);
    console.log('Time:', time);
    console.log('Channels:', channels);
  }
  
  console.log('\n\nTotal events found in first pass:', count);
}

testSchedule().catch(console.error);
