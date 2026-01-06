const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

console.log('=== Analyzing Casthill Embed ===\n');

// Look for Clappr player initialization
const clapprPattern = /new\s+Clappr\.Player\s*\(\s*\{([^}]+)\}/gs;
let match = clapprPattern.exec(html);
if (match) {
  console.log('Clappr Player Config:');
  console.log(match[1].substring(0, 500));
}

// Look for source/file configuration
const sourcePattern = /(?:source|sources|file|src)\s*:\s*["']([^"']+)["']/gi;
console.log('\nSource configurations:');
while ((match = sourcePattern.exec(html)) !== null) {
  if (match[1].includes('http') || match[1].includes('//')) {
    console.log(' ', match[1]);
  }
}

// Look for HLS/stream related variables
const hlsPattern = /(?:hls|stream|m3u8|playlist)(?:Url|Source|File)?\s*[=:]\s*["']([^"']+)["']/gi;
console.log('\nHLS/Stream variables:');
while ((match = hlsPattern.exec(html)) !== null) {
  console.log(' ', match[0].substring(0, 200));
}

// Look for API calls that might return stream URLs
const fetchPattern = /fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi;
console.log('\nFetch calls:');
while ((match = fetchPattern.exec(html)) !== null) {
  console.log(' ', match[1]);
}

// Look for any domain patterns that might be stream servers
const domainPattern = /https?:\/\/[a-z0-9.-]+(?:\.(?:pro|live|stream|tv|cc|me|io))[^\s"'<>]*/gi;
const domains = new Set();
while ((match = domainPattern.exec(html)) !== null) {
  domains.add(match[0]);
}
console.log('\nStream-related domains:');
[...domains].forEach(d => console.log(' ', d));

// Look for the channel/stream ID usage
const channelPattern = /(?:st1hd|st1sd|nba1hd|nba1sd)[^\s"'<>]*/gi;
console.log('\nChannel ID references:');
while ((match = channelPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}

// Look for any base URL patterns
const baseUrlPattern = /(?:baseUrl|apiUrl|streamUrl|serverUrl)\s*[=:]\s*["']([^"']+)["']/gi;
console.log('\nBase URL patterns:');
while ((match = baseUrlPattern.exec(html)) !== null) {
  console.log(' ', match[0]);
}

// Look for inline script content that might have stream logic
const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let scriptNum = 0;
console.log('\nInline scripts analysis:');
while ((match = scriptPattern.exec(html)) !== null) {
  const content = match[1].trim();
  if (content.length > 100 && content.length < 50000) {
    // Check if this script has stream-related content
    if (content.includes('m3u8') || content.includes('hls') || content.includes('stream') || 
        content.includes('source') || content.includes('Clappr')) {
      console.log(`\nScript #${scriptNum} (${content.length} chars) - contains stream logic:`);
      // Find the relevant parts
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('m3u8') || line.includes('source') || line.includes('hls') || 
            line.includes('Clappr') || line.includes('player')) {
          console.log(`  Line ${i}: ${line.substring(0, 150)}`);
        }
      });
    }
    scriptNum++;
  }
}

// Look for obfuscated variable that might contain stream URL
const obfuscatedPattern = /var\s+_0x[a-f0-9]+\s*=\s*\[([^\]]+)\]/;
match = obfuscatedPattern.exec(html);
if (match) {
  console.log('\nObfuscated array found, checking for URLs...');
  const arrayContent = match[1];
  const urlMatches = arrayContent.match(/https?:[^"']+/g);
  if (urlMatches) {
    urlMatches.forEach(u => console.log(' ', u));
  }
}
