#!/usr/bin/env bun
/**
 * Reverse engineer streamed.pk - find the actual stream source
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function analyzeEmbedPage() {
  // The embed page loads bundle-jw.js which sets up the player
  // The stream URL must be passed to the player somehow
  
  // Let's check if there's data in the HTML or if it's fetched via API
  const embedUrl = 'https://embedsports.top/embed/charlie/final-1629472869/1';
  
  console.log('=== Fetching embed page ===');
  const res = await fetch(embedUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': 'https://streamed.pk/',
    }
  });
  
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  // The HTML shows the player is loaded dynamically
  // Let's check what the bundle does with the URL path
  
  // The path is /embed/charlie/final-1629472869/1
  // This likely maps to: source=charlie, id=final-1629472869, streamNo=1
}

async function searchBundleForStreamLogic() {
  const js = await Bun.file('streamed-bundle-jw.js').text();
  
  console.log('\n=== Searching for stream URL logic ===');
  
  // Look for where pathname is parsed
  const pathIdx = js.indexOf('pathname');
  if (pathIdx !== -1) {
    // Get context
    for (let i = 0; i < 5; i++) {
      const nextIdx = js.indexOf('pathname', pathIdx + 1 + i * 100);
      if (nextIdx !== -1) {
        const context = js.substring(Math.max(0, nextIdx - 100), Math.min(js.length, nextIdx + 200));
        console.log(`\nPathname context ${i}:`);
        console.log(context.replace(/\s+/g, ' ').substring(0, 250));
      }
    }
  }
  
  // Look for the actual player setup
  console.log('\n=== Looking for player.setup or jwplayer.setup ===');
  const setupIdx = js.indexOf('.setup(');
  if (setupIdx !== -1) {
    const context = js.substring(Math.max(0, setupIdx - 200), Math.min(js.length, setupIdx + 300));
    console.log('Setup context:');
    console.log(context.replace(/\s+/g, ' ').substring(0, 400));
  }
  
  // The key insight: the bundle is JWPlayer + some custom code
  // Let's find where the custom code starts (after JWPlayer library)
  console.log('\n=== Looking for custom code after JWPlayer ===');
  
  // JWPlayer usually ends with something like jwplayer.version
  const versionIdx = js.lastIndexOf('version');
  if (versionIdx !== -1) {
    // Get the last 5000 chars which should be custom code
    const customCode = js.substring(js.length - 10000);
    await Bun.write('streamed-custom-code.js', customCode);
    console.log('Saved last 10000 chars to streamed-custom-code.js');
    
    // Search for stream-related patterns in custom code
    const patterns = [
      /fetch\s*\(/gi,
      /\.m3u8/gi,
      /stream/gi,
      /source/gi,
      /playlist/gi,
    ];
    
    for (const pattern of patterns) {
      const matches = customCode.match(pattern);
      if (matches) {
        console.log(`Found "${pattern.source}": ${matches.length} times`);
      }
    }
  }
}

async function checkNetworkRequests() {
  // The embed page must make a request to get the stream URL
  // Let's try to find what API it calls
  
  console.log('\n=== Checking for API patterns ===');
  
  const js = await Bun.file('streamed-bundle-jw.js').text();
  
  // Look for fetch or XMLHttpRequest patterns
  const fetchPattern = /fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  const xhrPattern = /\.open\s*\(\s*["'](?:GET|POST)["']\s*,\s*["'`]([^"'`]+)["'`]/gi;
  
  console.log('Fetch calls:');
  let match;
  while ((match = fetchPattern.exec(js)) !== null) {
    const url = match[1];
    if (!url.includes('jwplayer') && !url.includes('cloudflare') && !url.includes('google')) {
      console.log('  ', url.substring(0, 100));
    }
  }
  
  console.log('\nXHR calls:');
  while ((match = xhrPattern.exec(js)) !== null) {
    const url = match[1];
    if (!url.includes('jwplayer') && !url.includes('cloudflare') && !url.includes('google')) {
      console.log('  ', url.substring(0, 100));
    }
  }
}

async function tryDirectStreamUrls() {
  console.log('\n=== Trying direct stream URL patterns ===');
  
  const source = 'charlie';
  const id = 'final-1629472869';
  const streamNo = '1';
  
  // Common CDN patterns
  const patterns = [
    // embedsports.top patterns
    `https://embedsports.top/hls/${source}/${id}/${streamNo}/playlist.m3u8`,
    `https://embedsports.top/hls/${source}/${id}/playlist.m3u8`,
    `https://embedsports.top/stream/${source}/${id}/${streamNo}.m3u8`,
    `https://embedsports.top/live/${source}/${id}/${streamNo}/index.m3u8`,
    `https://embedsports.top/api/hls/${source}/${id}/${streamNo}`,
    
    // rr.vipstreams patterns (common for sports)
    `https://rr.vipstreams.in/charlie/${id}/playlist.m3u8`,
    `https://rr.vipstreams.in/${source}/${id}/playlist.m3u8`,
    
    // Other common patterns
    `https://cdn.${source}.stream/${id}/playlist.m3u8`,
    `https://${source}.embedsports.top/${id}/playlist.m3u8`,
  ];
  
  for (const url of patterns) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': 'https://embedsports.top/',
          'Origin': 'https://embedsports.top',
        }
      });
      
      const contentType = res.headers.get('content-type') || '';
      console.log(`${res.status} ${url.substring(0, 60)}... [${contentType.split(';')[0]}]`);
      
      if (res.ok) {
        const text = await res.text();
        if (text.includes('#EXTM3U')) {
          console.log('  ^ FOUND M3U8!');
          console.log(text.substring(0, 300));
        }
      }
    } catch (e: any) {
      console.log(`ERR ${url.substring(0, 60)}... - ${e.message}`);
    }
  }
}

async function analyzeCustomCode() {
  console.log('\n=== Analyzing custom code section ===');
  
  const js = await Bun.file('streamed-bundle-jw.js').text();
  
  // The bundle likely has custom code at the end that handles the embed
  // Let's look for the part that's NOT JWPlayer library
  
  // Find where the custom initialization happens
  const initPatterns = [
    /document\.addEventListener\s*\(\s*["']DOMContentLoaded["']/gi,
    /window\.onload/gi,
    /\$\s*\(\s*document\s*\)/gi,
    /\$\s*\(\s*function/gi,
  ];
  
  for (const pattern of initPatterns) {
    const idx = js.search(pattern);
    if (idx !== -1) {
      const context = js.substring(idx, Math.min(js.length, idx + 500));
      console.log(`\nFound init pattern at ${idx}:`);
      console.log(context.replace(/\s+/g, ' ').substring(0, 400));
    }
  }
  
  // Look for where the stream source is determined
  // It might use the URL path to construct the stream URL
  console.log('\n=== Looking for URL path usage ===');
  const urlPatterns = [
    /location\.href/gi,
    /location\.pathname/gi,
    /window\.location/gi,
    /document\.URL/gi,
  ];
  
  for (const pattern of urlPatterns) {
    let match;
    let count = 0;
    while ((match = pattern.exec(js)) !== null && count < 3) {
      const context = js.substring(Math.max(0, match.index - 50), Math.min(js.length, match.index + 150));
      console.log(`\n${pattern.source} at ${match.index}:`);
      console.log(context.replace(/\s+/g, ' ').substring(0, 180));
      count++;
    }
  }
}

// Run all
analyzeEmbedPage()
  .then(() => searchBundleForStreamLogic())
  .then(() => checkNetworkRequests())
  .then(() => tryDirectStreamUrls())
  .then(() => analyzeCustomCode())
  .catch(console.error);
