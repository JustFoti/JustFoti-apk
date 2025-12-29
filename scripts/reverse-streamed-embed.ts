#!/usr/bin/env bun
/**
 * Reverse engineer streamed.pk embed to find m3u8 URLs
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithHeaders(url: string, referer?: string) {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  if (referer) {
    headers['Referer'] = referer;
  }
  return fetch(url, { headers });
}

async function analyzeEmbed(embedUrl: string) {
  console.log('\n=== Analyzing Embed ===');
  console.log('URL:', embedUrl);
  
  try {
    const response = await fetchWithHeaders(embedUrl, 'https://streamed.pk/');
    const html = await response.text();
    
    console.log('\nResponse status:', response.status);
    console.log('Content length:', html.length);
    
    // Save full HTML for analysis
    await Bun.write('streamed-embed-response.html', html);
    console.log('Saved full HTML to streamed-embed-response.html');
    
    // Look for script tags
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    console.log('\nFound', scriptMatches.length, 'script tags');
    
    // Look for m3u8 patterns
    const m3u8Patterns = [
      /["']([^"']*\.m3u8[^"']*)["']/gi,
      /source[:\s]*["']([^"']+)["']/gi,
      /file[:\s]*["']([^"']+)["']/gi,
      /src[:\s]*["']([^"']+)["']/gi,
      /hls\.loadSource\s*\(\s*["']([^"']+)["']/gi,
      /player\.src\s*\(\s*\{[^}]*src[:\s]*["']([^"']+)["']/gi,
      /videoUrl[:\s]*["']([^"']+)["']/gi,
      /streamUrl[:\s]*["']([^"']+)["']/gi,
    ];
    
    console.log('\n=== Looking for stream URLs ===');
    for (const pattern of m3u8Patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1];
        if (url && (url.includes('.m3u8') || url.includes('stream') || url.includes('hls'))) {
          console.log('Found:', url.substring(0, 100));
        }
      }
    }
    
    // Look for base64 encoded content
    const base64Pattern = /atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/gi;
    console.log('\n=== Looking for base64 encoded URLs ===');
    let b64Match;
    while ((b64Match = base64Pattern.exec(html)) !== null) {
      try {
        const decoded = Buffer.from(b64Match[1], 'base64').toString('utf-8');
        console.log('Decoded base64:', decoded.substring(0, 100));
        if (decoded.includes('.m3u8') || decoded.includes('http')) {
          console.log('  ^ Contains URL!');
        }
      } catch {}
    }
    
    // Look for iframe sources
    const iframePattern = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
    console.log('\n=== Looking for iframes ===');
    let iframeMatch;
    while ((iframeMatch = iframePattern.exec(html)) !== null) {
      console.log('Iframe src:', iframeMatch[1]);
    }
    
    // Look for API endpoints
    const apiPattern = /["'](\/api\/[^"']+|https?:\/\/[^"']*api[^"']*)["']/gi;
    console.log('\n=== Looking for API endpoints ===');
    let apiMatch;
    while ((apiMatch = apiPattern.exec(html)) !== null) {
      console.log('API:', apiMatch[1].substring(0, 100));
    }
    
    // Look for fetch/axios calls
    const fetchPattern = /fetch\s*\(\s*["']([^"']+)["']/gi;
    console.log('\n=== Looking for fetch calls ===');
    let fetchMatch;
    while ((fetchMatch = fetchPattern.exec(html)) !== null) {
      console.log('Fetch:', fetchMatch[1]);
    }
    
    // Extract all URLs
    const urlPattern = /https?:\/\/[^\s"'<>]+/gi;
    const allUrls = new Set<string>();
    let urlMatch;
    while ((urlMatch = urlPattern.exec(html)) !== null) {
      allUrls.add(urlMatch[0]);
    }
    
    console.log('\n=== All unique URLs found ===');
    for (const url of allUrls) {
      if (url.includes('m3u8') || url.includes('stream') || url.includes('hls') || url.includes('video')) {
        console.log(url);
      }
    }
    
    // Look for JavaScript variables
    const varPatterns = [
      /var\s+(\w+)\s*=\s*["']([^"']+)["']/gi,
      /const\s+(\w+)\s*=\s*["']([^"']+)["']/gi,
      /let\s+(\w+)\s*=\s*["']([^"']+)["']/gi,
    ];
    
    console.log('\n=== JavaScript variables with URLs ===');
    for (const pattern of varPatterns) {
      let varMatch;
      while ((varMatch = pattern.exec(html)) !== null) {
        const [, name, value] = varMatch;
        if (value.includes('http') || value.includes('.m3u8')) {
          console.log(`${name} = ${value.substring(0, 80)}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function getStreamInfo() {
  // First get a live match
  console.log('=== Fetching live matches ===');
  const matchesRes = await fetch('https://streamed.pk/api/matches/all', {
    headers: { 'User-Agent': USER_AGENT }
  });
  const matches = await matchesRes.json();
  
  // Find a live match
  const now = Date.now();
  const threeHoursMs = 3 * 60 * 60 * 1000;
  const liveMatch = matches.find((m: any) => {
    const matchTime = m.date;
    return matchTime <= now && (now - matchTime) < threeHoursMs && m.sources?.length > 0;
  });
  
  if (!liveMatch) {
    console.log('No live matches found, using first match with sources');
    const matchWithSources = matches.find((m: any) => m.sources?.length > 0);
    if (!matchWithSources) {
      console.log('No matches with sources found');
      return;
    }
    await analyzeMatch(matchWithSources);
  } else {
    console.log('Found live match:', liveMatch.title);
    await analyzeMatch(liveMatch);
  }
}

async function analyzeMatch(match: any) {
  console.log('\n=== Match Info ===');
  console.log('Title:', match.title);
  console.log('Category:', match.category);
  console.log('Sources:', match.sources.length);
  
  for (const source of match.sources.slice(0, 2)) {
    console.log(`\n--- Source: ${source.source}:${source.id} ---`);
    
    // Get stream info from API
    const streamRes = await fetch(`https://streamed.pk/api/stream/${source.source}/${source.id}`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    const streams = await streamRes.json();
    
    console.log('Streams available:', streams.length);
    
    if (streams.length > 0) {
      const stream = streams[0];
      console.log('Stream #1:');
      console.log('  Embed URL:', stream.embedUrl);
      console.log('  Source:', stream.source);
      console.log('  HD:', stream.hd);
      
      // Analyze the embed
      if (stream.embedUrl) {
        await analyzeEmbed(stream.embedUrl);
      }
    }
  }
}

// Run
getStreamInfo().catch(console.error);
