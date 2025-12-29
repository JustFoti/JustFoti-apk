#!/usr/bin/env bun
/**
 * Reverse engineer streamed.pk embed - analyze the player bundle
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithHeaders(url: string, referer?: string) {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  if (referer) {
    headers['Referer'] = referer;
  }
  return fetch(url, { headers });
}

async function analyzePlayerBundle() {
  const embedUrl = 'https://embedsports.top/embed/charlie/final-1629472869/1';
  const baseUrl = 'https://embedsports.top';
  
  console.log('=== Fetching player bundle ===');
  
  // Fetch the JW player bundle
  const bundleUrl = `${baseUrl}/js/bundle-jw.js?v=8`;
  console.log('Bundle URL:', bundleUrl);
  
  const response = await fetchWithHeaders(bundleUrl, embedUrl);
  const js = await response.text();
  
  console.log('Bundle size:', js.length);
  await Bun.write('streamed-bundle-jw.js', js);
  console.log('Saved to streamed-bundle-jw.js');
  
  // Look for API endpoints
  console.log('\n=== Looking for API endpoints ===');
  const apiPatterns = [
    /["'](\/api\/[^"']+)["']/gi,
    /["'](https?:\/\/[^"']*\/api\/[^"']*)["']/gi,
    /fetch\s*\(\s*["']([^"']+)["']/gi,
    /axios[^(]*\(\s*["']([^"']+)["']/gi,
  ];
  
  for (const pattern of apiPatterns) {
    let match;
    while ((match = pattern.exec(js)) !== null) {
      console.log('API:', match[1].substring(0, 100));
    }
  }
  
  // Look for m3u8 patterns
  console.log('\n=== Looking for m3u8/stream patterns ===');
  const streamPatterns = [
    /["']([^"']*\.m3u8[^"']*)["']/gi,
    /["']([^"']*m3u8[^"']*)["']/gi,
    /["']([^"']*stream[^"']*)["']/gi,
    /["']([^"']*hls[^"']*)["']/gi,
    /source[:\s]*["']([^"']+)["']/gi,
    /file[:\s]*["']([^"']+)["']/gi,
  ];
  
  const foundUrls = new Set<string>();
  for (const pattern of streamPatterns) {
    let match;
    while ((match = pattern.exec(js)) !== null) {
      const url = match[1];
      if (url.length > 5 && url.length < 200 && !foundUrls.has(url)) {
        foundUrls.add(url);
        if (url.includes('http') || url.includes('.m3u8') || url.includes('/api')) {
          console.log(url);
        }
      }
    }
  }
  
  // Look for URL construction patterns
  console.log('\n=== Looking for URL construction ===');
  const urlConstructPatterns = [
    /(\w+)\s*\+\s*["']\/[^"']+["']/gi,
    /["'][^"']+["']\s*\+\s*(\w+)/gi,
    /`[^`]*\$\{[^}]+\}[^`]*`/gi,
  ];
  
  for (const pattern of urlConstructPatterns) {
    let match;
    const matches: string[] = [];
    while ((match = pattern.exec(js)) !== null) {
      if (match[0].includes('stream') || match[0].includes('m3u8') || match[0].includes('api')) {
        matches.push(match[0].substring(0, 100));
      }
    }
    if (matches.length > 0) {
      console.log('Found', matches.length, 'URL constructions');
      matches.slice(0, 10).forEach(m => console.log('  ', m));
    }
  }
  
  // Look for base64 decoding
  console.log('\n=== Looking for base64 patterns ===');
  const b64Pattern = /atob\s*\(\s*([^)]+)\)/gi;
  let b64Match;
  while ((b64Match = b64Pattern.exec(js)) !== null) {
    console.log('atob call:', b64Match[0].substring(0, 80));
  }
  
  // Look for specific function patterns
  console.log('\n=== Looking for player setup functions ===');
  const funcPatterns = [
    /function\s+(\w*[Ss]tream\w*)\s*\(/gi,
    /function\s+(\w*[Pp]layer\w*)\s*\(/gi,
    /function\s+(\w*[Ss]ource\w*)\s*\(/gi,
    /(\w+)\s*=\s*function\s*\([^)]*\)\s*\{[^}]*stream/gi,
    /(\w+)\s*=\s*async\s*function/gi,
    /const\s+(\w+)\s*=\s*async\s*\(/gi,
  ];
  
  for (const pattern of funcPatterns) {
    let match;
    while ((match = pattern.exec(js)) !== null) {
      console.log('Function:', match[0].substring(0, 60));
    }
  }
  
  // Search for specific keywords in context
  console.log('\n=== Searching for key patterns ===');
  const keywords = ['playlist', 'sources', 'file:', 'src:', 'hls', 'jwplayer', 'setup'];
  for (const keyword of keywords) {
    const idx = js.indexOf(keyword);
    if (idx !== -1) {
      const context = js.substring(Math.max(0, idx - 50), Math.min(js.length, idx + 100));
      console.log(`\n"${keyword}" found at ${idx}:`);
      console.log(context.replace(/\n/g, ' ').substring(0, 150));
    }
  }
}

async function analyzeEmbedPath() {
  // The embed URL pattern is /embed/{source}/{id}/{streamNo}
  // Let's see if there's a direct API we can call
  
  console.log('\n\n=== Testing direct API calls ===');
  
  const source = 'charlie';
  const id = 'final-1629472869';
  
  // Try various API endpoints
  const endpoints = [
    `https://embedsports.top/api/stream/${source}/${id}`,
    `https://embedsports.top/api/source/${source}/${id}`,
    `https://embedsports.top/stream/${source}/${id}`,
    `https://embedsports.top/api/${source}/${id}`,
    `https://embedsports.top/api/v1/stream/${source}/${id}`,
    `https://embedsports.top/hls/${source}/${id}/playlist.m3u8`,
    `https://embedsports.top/${source}/${id}/playlist.m3u8`,
    `https://embedsports.top/live/${source}/${id}`,
  ];
  
  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithHeaders(endpoint, 'https://embedsports.top/');
      const contentType = res.headers.get('content-type') || '';
      console.log(`${res.status} ${endpoint.split('embedsports.top')[1]} [${contentType.split(';')[0]}]`);
      
      if (res.ok) {
        const text = await res.text();
        if (text.includes('#EXTM3U') || text.includes('.m3u8')) {
          console.log('  ^ Found m3u8!');
          console.log(text.substring(0, 200));
        } else if (text.length < 500) {
          console.log('  Response:', text.substring(0, 100));
        }
      }
    } catch (e) {
      console.log(`ERR ${endpoint.split('embedsports.top')[1]}`);
    }
  }
}

// Run both analyses
analyzePlayerBundle().then(() => analyzeEmbedPath()).catch(console.error);
