const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

console.log('=== Finding source URL construction ===\n');

// Look for variable n assignment near sourceUrl
const contextPattern = /([a-z_$][a-z0-9_$]*)\s*=\s*["']([^"']+\.m3u8[^"']*)["']/gi;
let match;
while ((match = contextPattern.exec(html)) !== null) {
  console.log('m3u8 assignment:', match[1], '=', match[2]);
}

// Look for any m3u8 URL construction
const m3u8Pattern = /["']([^"']*m3u8[^"']*)["']/gi;
console.log('\nAll m3u8 references:');
while ((match = m3u8Pattern.exec(html)) !== null) {
  console.log(' ', match[1]);
}

// Look for the source URL being built
const buildPattern = /source[^=]*=\s*[`"']([^`"']+)[`"']/gi;
console.log('\nSource assignments:');
while ((match = buildPattern.exec(html)) !== null) {
  if (match[1].length < 200) {
    console.log(' ', match[1]);
  }
}

// Look for template literals that might build URLs
const templatePattern = /`[^`]*\$\{[^}]+\}[^`]*`/g;
console.log('\nTemplate literals:');
const templates = html.match(templatePattern);
if (templates) {
  templates.slice(0, 20).forEach(t => {
    if (t.includes('http') || t.includes('m3u8') || t.includes('stream')) {
      console.log(' ', t.substring(0, 150));
    }
  });
}

// Look for the Clappr player source configuration
const clapprPattern = /Clappr\.Player\s*\(\s*\{([^}]+source[^}]+)\}/gs;
while ((match = clapprPattern.exec(html)) !== null) {
  console.log('\nClappr config with source:');
  console.log(match[1].substring(0, 500));
}

// Look for HLS source
const hlsPattern = /(?:hls|HLS)[^{]*\{([^}]*source[^}]*)\}/gi;
while ((match = hlsPattern.exec(html)) !== null) {
  console.log('\nHLS config:', match[1].substring(0, 300));
}

// Find the actual stream URL pattern - look for domain + path patterns
const streamDomainPattern = /https?:\/\/[a-z0-9.-]+(?:\.(?:pro|live|cc|me|io|tv))[^\s"'<>]+/gi;
console.log('\nStream domains:');
const domains = new Set();
while ((match = streamDomainPattern.exec(html)) !== null) {
  domains.add(match[0]);
}
[...domains].forEach(d => console.log(' ', d));

// Look for the channel ID being used in URL construction
const channelUrlPattern = /(?:st1hd|st1sd|nba1hd|nba1sd)[^\s"'<>]*/gi;
console.log('\nChannel in URLs:');
while ((match = channelUrlPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}

// Look for fetch/axios calls that might get stream URL
const fetchPattern = /fetch\s*\([^)]+\)/g;
console.log('\nFetch calls:');
const fetches = html.match(fetchPattern);
if (fetches) {
  fetches.slice(0, 10).forEach(f => console.log(' ', f.substring(0, 150)));
}

// Look for the P2P engine config which has the source
const p2pPattern = /P2PEngine[^{]*\{([^}]+)\}/gi;
while ((match = p2pPattern.exec(html)) !== null) {
  console.log('\nP2P Engine config:');
  console.log(match[1].substring(0, 500));
}

// Search for dlolcast or similar known stream providers
const providerPattern = /(?:dlolcast|rfrsh|topembed|weakstream|givemereddit)[^\s"'<>]*/gi;
console.log('\nKnown providers:');
while ((match = providerPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}
