/**
 * Extract all scripts from the casthill embed
 */

const fs = require('fs');
const html = fs.readFileSync('casthill-embed-full.html', 'utf8');

console.log('=== Extracting Scripts ===\n');
console.log('HTML length:', html.length);

// Find all script tags
const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptNum = 0;

while ((match = scriptPattern.exec(html)) !== null) {
  const content = match[1].trim();
  if (content.length > 50) {
    scriptNum++;
    console.log(`\nScript #${scriptNum}: ${content.length} chars`);
    
    // Check what's in this script
    const hasWindow = content.includes("window['");
    const hasFetch = content.includes('fetch');
    const hasClappr = content.includes('Clappr');
    const hasAsync = content.includes('async');
    const hasScode = content.includes('scode');
    const hasM3u8 = content.includes('m3u8');
    
    console.log('  Contains: window[]=', hasWindow, 'fetch=', hasFetch, 
                'Clappr=', hasClappr, 'async=', hasAsync, 
                'scode=', hasScode, 'm3u8=', hasM3u8);
    
    // Save interesting scripts
    if (hasFetch || hasClappr || hasScode || hasM3u8) {
      const filename = `scripts/casthill-script-${scriptNum}.js`;
      fs.writeFileSync(filename, content);
      console.log('  Saved to:', filename);
    }
    
    // Show first 200 chars
    console.log('  Preview:', content.substring(0, 200).replace(/\n/g, ' '));
  }
}

console.log('\n\nTotal scripts found:', scriptNum);

// Also look for inline event handlers
const onloadPattern = /onload\s*=\s*["']([^"']+)["']/gi;
console.log('\nOnload handlers:');
while ((match = onloadPattern.exec(html)) !== null) {
  console.log(' ', match[1].substring(0, 100));
}

// Look for data attributes that might contain config
const dataPattern = /data-[a-z-]+\s*=\s*["']([^"']+)["']/gi;
console.log('\nData attributes:');
while ((match = dataPattern.exec(html)) !== null) {
  if (match[1].length > 10 && match[1].length < 200) {
    console.log(' ', match[0].substring(0, 100));
  }
}
