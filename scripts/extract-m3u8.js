/**
 * Extract m3u8 URLs from VIPRow/Casthill
 * 
 * This script:
 * 1. Fetches a VIPRow stream page to get valid csrf tokens
 * 2. Fetches the casthill embed page
 * 3. Extracts the m3u8 stream URL
 */

const VIPROW_BASE = 'https://www.viprow.nu';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getStreamParams(eventUrl) {
  console.log('1. Fetching VIPRow stream page...');
  const streamUrl = `${VIPROW_BASE}${eventUrl}-1`;
  
  const response = await fetch(streamUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html',
      'Referer': VIPROW_BASE,
    }
  });
  
  const html = await response.text();
  
  const zmidMatch = html.match(/const\s+zmid\s*=\s*"([^"]+)"/);
  const pidMatch = html.match(/const\s+pid\s*=\s*(\d+)/);
  const edmMatch = html.match(/const\s+edm\s*=\s*"([^"]+)"/);
  const configMatch = html.match(/const siteConfig = (\{[^;]+\});/);
  
  if (!zmidMatch || !pidMatch || !edmMatch || !configMatch) {
    throw new Error('Could not extract stream params');
  }
  
  const config = JSON.parse(configMatch[1]);
  
  return {
    zmid: zmidMatch[1],
    pid: pidMatch[1],
    edm: edmMatch[1],
    csrf: config.csrf,
    csrf_ip: config.csrf_ip,
    category: config.linkAppendUri,
    referer: streamUrl,
  };
}

async function fetchCasthillEmbed(params) {
  console.log('\n2. Fetching Casthill embed page...');
  
  const embedParams = new URLSearchParams({
    pid: params.pid,
    gacat: '',
    gatxt: params.category,
    v: params.zmid,
    csrf: params.csrf,
    csrf_ip: params.csrf_ip,
  });
  
  const embedUrl = `https://${params.edm}/sd0embed/${params.category}?${embedParams}`;
  console.log('   URL:', embedUrl);
  
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html',
      'Referer': params.referer,
    }
  });
  
  const html = await response.text();
  console.log('   Response size:', html.length, 'bytes');
  
  return html;
}

function extractM3U8(html) {
  console.log('\n3. Searching for m3u8 URLs...');
  
  // Look for m3u8 URLs
  const m3u8Pattern = /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi;
  const m3u8Urls = html.match(m3u8Pattern);
  
  if (m3u8Urls) {
    console.log('   Found m3u8 URLs:');
    [...new Set(m3u8Urls)].forEach(url => console.log('   ', url));
    return m3u8Urls;
  }
  
  // Look for any streaming URLs
  const streamPattern = /https?:\/\/[^\s"'<>]+(?:stream|live|hls|playlist)[^\s"'<>]*/gi;
  const streamUrls = html.match(streamPattern);
  
  if (streamUrls) {
    console.log('   Found stream URLs:');
    [...new Set(streamUrls)].forEach(url => console.log('   ', url));
    return streamUrls;
  }
  
  // Look for any video source patterns
  const srcPattern = /(?:src|source|file|url)\s*[=:]\s*["']([^"']+)/gi;
  const sources = [];
  let match;
  while ((match = srcPattern.exec(html)) !== null) {
    if (match[1].includes('http') && !match[1].includes('.js') && !match[1].includes('.css')) {
      sources.push(match[1]);
    }
  }
  
  if (sources.length > 0) {
    console.log('   Found source URLs:');
    [...new Set(sources)].forEach(url => console.log('   ', url));
    return sources;
  }
  
  console.log('   No stream URLs found directly in HTML');
  
  // Save HTML for analysis
  require('fs').writeFileSync('casthill-embed-full.html', html);
  console.log('   Saved full HTML to casthill-embed-full.html for analysis');
  
  return null;
}

async function analyzeEmbedStructure(html) {
  console.log('\n4. Analyzing embed structure...');
  
  // Look for script sources
  const scriptSrcPattern = /<script[^>]*src="([^"]+)"[^>]*>/gi;
  const scripts = [];
  let match;
  while ((match = scriptSrcPattern.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  
  if (scripts.length > 0) {
    console.log('   External scripts:');
    scripts.forEach(s => console.log('   ', s));
  }
  
  // Look for API endpoints
  const apiPattern = /['"](?:https?:)?\/\/[^'"]*(?:api|stream|play|hls)[^'"]*['"]/gi;
  const apis = html.match(apiPattern);
  
  if (apis) {
    console.log('   API endpoints:');
    [...new Set(apis)].forEach(a => console.log('   ', a));
  }
  
  // Look for player config
  const configPattern = /(?:player|stream|video)Config\s*[=:]\s*(\{[^}]+\})/gi;
  while ((match = configPattern.exec(html)) !== null) {
    console.log('   Player config:', match[1].substring(0, 200));
  }
  
  // Look for channel/stream IDs
  const channelPattern = /(?:channel|stream|source)(?:Id|Name|Key)?\s*[=:]\s*["']([^"']+)["']/gi;
  while ((match = channelPattern.exec(html)) !== null) {
    console.log('   Channel/Stream ID:', match[1]);
  }
}

async function main() {
  try {
    // First get a live event from the schedule
    console.log('0. Fetching VIPRow schedule...');
    const scheduleRes = await fetch(`${VIPROW_BASE}/sports-big-games`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    const scheduleHtml = await scheduleRes.text();
    
    const eventPattern = /href="([^"]+online-stream)"[^>]*role="button"/;
    const eventMatch = scheduleHtml.match(eventPattern);
    
    if (!eventMatch) {
      throw new Error('No events found');
    }
    
    const eventUrl = eventMatch[1];
    console.log('   Found event:', eventUrl);
    
    // Get stream params
    const params = await getStreamParams(eventUrl);
    console.log('   zmid:', params.zmid);
    console.log('   pid:', params.pid);
    console.log('   edm:', params.edm);
    
    // Fetch embed
    const embedHtml = await fetchCasthillEmbed(params);
    
    // Extract m3u8
    const urls = extractM3U8(embedHtml);
    
    // Analyze structure
    await analyzeEmbedStructure(embedHtml);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
