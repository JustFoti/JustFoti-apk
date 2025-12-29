#!/usr/bin/env bun
/**
 * Reverse engineer streamed.pk embed - deep analysis
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Decode the base64 strings found
console.log('=== Decoding base64 strings ===');
const b64Strings = [
  'aHR0cHM6Ly9wcm8uaXAtYXBpLmNvbS9qc29uP2ZpZWxkcz0yMTgxODI2JmtleT1YT3BpYW5zUm',
  'aHR0cHM6Ly9zd2FybWNsb3VkLm5ldA==',
];

for (const b64 of b64Strings) {
  try {
    // Try with padding
    let padded = b64;
    while (padded.length % 4 !== 0) padded += '=';
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    console.log(`${b64.substring(0, 30)}... => ${decoded}`);
  } catch (e) {
    console.log(`Failed to decode: ${b64.substring(0, 30)}...`);
  }
}

async function analyzeBundle() {
  const js = await Bun.file('streamed-bundle-jw.js').text();
  
  console.log('\n=== Searching for stream source logic ===');
  
  // Look for where the stream URL is set
  const patterns = [
    // JWPlayer setup patterns
    /setup\s*\(\s*\{[^}]*file\s*:/gi,
    /setup\s*\(\s*\{[^}]*sources\s*:/gi,
    /\.load\s*\(\s*\{[^}]*file\s*:/gi,
    // Source assignment
    /sources\s*=\s*\[/gi,
    /file\s*=\s*["'][^"']+["']/gi,
    /playlist\s*=\s*\[/gi,
    // Fetch patterns for stream data
    /fetch\s*\([^)]*stream/gi,
    /fetch\s*\([^)]*source/gi,
    /fetch\s*\([^)]*hls/gi,
    // URL patterns
    /["']https?:\/\/[^"']*stream[^"']*["']/gi,
    /["']https?:\/\/[^"']*hls[^"']*["']/gi,
    /["']https?:\/\/[^"']*m3u8[^"']*["']/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = js.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`\nPattern ${pattern.source.substring(0, 30)}:`);
      matches.slice(0, 5).forEach(m => console.log('  ', m.substring(0, 100)));
    }
  }
  
  // Look for the embed path parsing
  console.log('\n=== Looking for path parsing ===');
  const pathPatterns = [
    /location\.pathname/gi,
    /window\.location/gi,
    /pathname\.split/gi,
    /\/embed\//gi,
  ];
  
  for (const pattern of pathPatterns) {
    const idx = js.search(pattern);
    if (idx !== -1) {
      const context = js.substring(Math.max(0, idx - 100), Math.min(js.length, idx + 200));
      console.log(`\nFound "${pattern.source}" at ${idx}:`);
      console.log(context.replace(/\s+/g, ' ').substring(0, 250));
    }
  }
  
  // Look for API base URLs
  console.log('\n=== Looking for API base URLs ===');
  const apiBasePatterns = [
    /["']https?:\/\/[^"']+\.top[^"']*["']/gi,
    /["']https?:\/\/[^"']+\.net[^"']*["']/gi,
    /["']https?:\/\/[^"']+\.io[^"']*["']/gi,
    /["']https?:\/\/[^"']+\.com\/api[^"']*["']/gi,
  ];
  
  const foundApis = new Set<string>();
  for (const pattern of apiBasePatterns) {
    let match;
    while ((match = pattern.exec(js)) !== null) {
      const url = match[0].replace(/["']/g, '');
      if (!url.includes('jwplayer') && !url.includes('cloudflare') && !url.includes('google')) {
        foundApis.add(url);
      }
    }
  }
  
  console.log('Found API URLs:');
  for (const url of foundApis) {
    console.log('  ', url);
  }
  
  // Search for specific embed-related code
  console.log('\n=== Searching for embed-specific code ===');
  const embedIdx = js.indexOf('/embed/');
  if (embedIdx !== -1) {
    // Get a larger context around /embed/
    const start = Math.max(0, embedIdx - 500);
    const end = Math.min(js.length, embedIdx + 500);
    const context = js.substring(start, end);
    console.log('Context around /embed/:');
    console.log(context.replace(/\s+/g, ' '));
  }
}

async function testSwarmCloud() {
  console.log('\n\n=== Testing SwarmCloud ===');
  // SwarmCloud is a P2P CDN - the stream might come from there
  
  const source = 'charlie';
  const id = 'final-1629472869';
  
  // Try swarmcloud endpoints
  const endpoints = [
    `https://swarmcloud.net/stream/${source}/${id}`,
    `https://swarmcloud.net/hls/${source}/${id}/playlist.m3u8`,
    `https://swarmcloud.net/api/stream/${source}/${id}`,
  ];
  
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { 'User-Agent': USER_AGENT }
      });
      console.log(`${res.status} ${endpoint}`);
      if (res.ok) {
        const text = await res.text();
        console.log('  Response:', text.substring(0, 100));
      }
    } catch (e) {
      console.log(`ERR ${endpoint}`);
    }
  }
}

async function findStreamInBundle() {
  const js = await Bun.file('streamed-bundle-jw.js').text();
  
  console.log('\n\n=== Deep search for stream URL construction ===');
  
  // Look for where the actual stream URL is built
  // The embed URL is /embed/{source}/{id}/{streamNo}
  // The code must parse this and construct a stream URL
  
  // Search for template literals that might construct URLs
  const templatePattern = /`[^`]{10,200}`/g;
  let match;
  const templates: string[] = [];
  while ((match = templatePattern.exec(js)) !== null) {
    const tpl = match[0];
    if (tpl.includes('http') || tpl.includes('stream') || tpl.includes('hls') || tpl.includes('m3u8')) {
      templates.push(tpl);
    }
  }
  
  console.log('Found', templates.length, 'relevant template literals:');
  templates.slice(0, 20).forEach(t => console.log('  ', t.substring(0, 100)));
  
  // Look for object with stream configuration
  console.log('\n=== Looking for stream config objects ===');
  const configPatterns = [
    /\{[^{}]*file\s*:\s*[^{}]+\}/gi,
    /\{[^{}]*sources\s*:\s*\[[^\]]+\]\s*\}/gi,
    /\{[^{}]*src\s*:\s*[^{}]+\}/gi,
  ];
  
  for (const pattern of configPatterns) {
    const matches = js.match(pattern);
    if (matches) {
      console.log(`\nPattern found ${matches.length} times:`);
      matches.slice(0, 3).forEach(m => {
        if (m.length < 300) console.log('  ', m);
      });
    }
  }
}

// Run all analyses
analyzeBundle()
  .then(() => testSwarmCloud())
  .then(() => findStreamInBundle())
  .catch(console.error);
