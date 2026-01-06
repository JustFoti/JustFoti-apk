const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

console.log('=== Finding stream URL variables ===\n');

// Find variable c (the base URL)
const cPattern = /[,;]\s*c\s*=\s*["']([^"']+)["']/g;
let match;
console.log('Variable c (base URL):');
while ((match = cPattern.exec(html)) !== null) {
  console.log(' ', match[1]);
}

// Find variable s (the stream ID)
const sPattern = /[,;]\s*s\s*=\s*["']([^"']+)["']/g;
console.log('\nVariable s (stream ID):');
while ((match = sPattern.exec(html)) !== null) {
  console.log(' ', match[1]);
}

// Look for the full URL construction context
const urlContext = html.indexOf('?scode=');
if (urlContext > 0) {
  console.log('\nURL construction context:');
  console.log(html.substring(urlContext - 100, urlContext + 200));
}

// Look for any https URLs that might be the stream server
const httpsPattern = /https:\/\/[a-z0-9.-]+\/[a-z0-9/._-]+/gi;
const urls = new Set();
while ((match = httpsPattern.exec(html)) !== null) {
  const url = match[0];
  if (!url.includes('jsdelivr') && !url.includes('google') && 
      !url.includes('cloudflare') && !url.includes('casthill.net/images') &&
      !url.includes('.js') && !url.includes('.css') && !url.includes('.png') &&
      !url.includes('.jpeg') && !url.includes('.svg') && !url.includes('swarmcloud')) {
    urls.add(url);
  }
}
console.log('\nFiltered URLs:');
[...urls].forEach(u => console.log(' ', u));

// Look for the stream server domain
const serverPattern = /["']https?:\/\/([a-z0-9.-]+)\/(?:hls|live|stream|play)/gi;
console.log('\nStream server patterns:');
while ((match = serverPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}

// Look for where c is defined
const cDefPattern = /const\s+c\s*=|let\s+c\s*=|var\s+c\s*=/g;
console.log('\nVariable c definitions:');
while ((match = cDefPattern.exec(html)) !== null) {
  const idx = match.index;
  console.log(' ', html.substring(idx, idx + 100));
}

// Look for the stream channel being used
const channelPattern = /st1hd|st1sd|nba1hd|nba1sd/gi;
console.log('\nChannel references:');
const channels = html.match(channelPattern);
if (channels) {
  console.log('  Found', channels.length, 'references');
  // Find context around first reference
  const firstIdx = html.indexOf('st1');
  if (firstIdx > 0) {
    console.log('  Context:', html.substring(firstIdx - 50, firstIdx + 100));
  }
}

// Look for the API endpoint that returns stream data
const apiPattern = /["']\/api\/[^"']+["']|["']https?:\/\/[^"']+\/api\/[^"']+["']/gi;
console.log('\nAPI endpoints:');
while ((match = apiPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}

// Look for fetch calls with their URLs
const fetchIdx = html.indexOf('fetch(');
if (fetchIdx > 0) {
  console.log('\nFirst fetch context:');
  console.log(html.substring(fetchIdx, fetchIdx + 200));
}
