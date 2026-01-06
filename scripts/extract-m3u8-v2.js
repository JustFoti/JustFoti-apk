/**
 * Extract m3u8 URLs from VIPRow/Casthill - Deep Analysis
 */

const fs = require('fs');
const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  try {
    // 1. Get event and stream params
    console.log('1. Fetching VIPRow schedule...');
    const scheduleRes = await fetch(`${VIPROW_BASE}/sports-big-games`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    const scheduleHtml = await scheduleRes.text();
    
    const eventMatch = scheduleHtml.match(/href="([^"]+online-stream)"[^>]*role="button"/);
    if (!eventMatch) throw new Error('No events found');
    
    const eventUrl = eventMatch[1];
    console.log('   Event:', eventUrl);
    
    // 2. Get stream params
    console.log('\n2. Fetching stream page...');
    const streamPageUrl = `${VIPROW_BASE}${eventUrl}-1`;
    const streamRes = await fetch(streamPageUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': VIPROW_BASE }
    });
    const streamHtml = await streamRes.text();
    
    const zmid = streamHtml.match(/const\s+zmid\s*=\s*"([^"]+)"/)?.[1];
    const pid = streamHtml.match(/const\s+pid\s*=\s*(\d+)/)?.[1];
    const edm = streamHtml.match(/const\s+edm\s*=\s*"([^"]+)"/)?.[1];
    const config = JSON.parse(streamHtml.match(/const siteConfig = (\{[^;]+\});/)?.[1] || '{}');
    
    console.log('   zmid:', zmid);
    console.log('   pid:', pid);
    console.log('   edm:', edm);
    
    // 3. Fetch casthill embed
    console.log('\n3. Fetching Casthill embed...');
    const embedParams = new URLSearchParams({
      pid, gacat: '', gatxt: config.linkAppendUri, v: zmid,
      csrf: config.csrf, csrf_ip: config.csrf_ip,
    });
    const embedUrl = `https://${edm}/sd0embed/${config.linkAppendUri}?${embedParams}`;
    
    const embedRes = await fetch(embedUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': streamPageUrl }
    });
    const embedHtml = await embedRes.text();
    
    fs.writeFileSync('casthill-embed-full.html', embedHtml);
    console.log('   Saved', embedHtml.length, 'bytes to casthill-embed-full.html');
    
    // 4. Deep analysis
    console.log('\n4. Analyzing embed for stream URLs...');
    
    // Look for the stream configuration
    // Casthill likely uses a pattern like: source: "https://..."
    const sourcePatterns = [
      /source\s*:\s*["']([^"']+\.m3u8[^"']*)/gi,
      /file\s*:\s*["']([^"']+\.m3u8[^"']*)/gi,
      /src\s*:\s*["']([^"']+\.m3u8[^"']*)/gi,
      /url\s*:\s*["']([^"']+\.m3u8[^"']*)/gi,
      /["']([^"']*\.m3u8[^"']*)/gi,
    ];
    
    for (const pattern of sourcePatterns) {
      let match;
      while ((match = pattern.exec(embedHtml)) !== null) {
        console.log('   Found:', match[1]);
      }
    }
    
    // Look for stream server domains
    const serverPattern = /https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?\/[^\s"'<>]+/gi;
    const servers = new Set();
    let match;
    while ((match = serverPattern.exec(embedHtml)) !== null) {
      const url = match[0];
      if (!url.includes('jsdelivr') && !url.includes('google') && 
          !url.includes('cloudflare') && !url.includes('swarmcloud') &&
          !url.includes('.js') && !url.includes('.css') && !url.includes('.svg')) {
        servers.add(url);
      }
    }
    
    if (servers.size > 0) {
      console.log('\n   Potential stream servers:');
      [...servers].forEach(s => console.log('   ', s));
    }
    
    // Look for the actual player initialization
    const playerInitPattern = /(?:new\s+)?(?:Clappr|Hls|videojs|JWPlayer)[\s\S]{0,500}source/gi;
    while ((match = playerInitPattern.exec(embedHtml)) !== null) {
      console.log('\n   Player init found:', match[0].substring(0, 200));
    }
    
    // Look for API endpoints that return stream data
    const apiPattern = /(?:fetch|axios|ajax)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    console.log('\n   API calls:');
    while ((match = apiPattern.exec(embedHtml)) !== null) {
      console.log('   ', match[1]);
    }
    
    // Check for obfuscated strings that might be decoded to URLs
    const base64Pattern = /atob\s*\(\s*["']([^"']+)["']\)/gi;
    console.log('\n   Base64 encoded strings:');
    while ((match = base64Pattern.exec(embedHtml)) !== null) {
      try {
        const decoded = Buffer.from(match[1], 'base64').toString('utf8');
        console.log('   ', decoded.substring(0, 100));
      } catch (e) {}
    }
    
    // Look for the zmid channel being used
    const zmidUsage = embedHtml.match(new RegExp(zmid.replace(/[~|]/g, '.'), 'gi'));
    if (zmidUsage) {
      console.log('\n   zmid usage found:', zmidUsage.length, 'times');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
