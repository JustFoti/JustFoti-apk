#!/usr/bin/env node
// Fetch and analyze MegaUp app.js

async function main() {
  const url = 'https://megaup22.online/assets/b/3b535435ee97ded4afb12d57f3f53b63db92/min/app.js?v=19a76d736f6';
  
  console.log('Fetching app.js...');
  const response = await fetch(url);
  const js = await response.text();
  
  console.log(`Got ${js.length} bytes\n`);
  
  // Look for __PAGE_DATA usage
  const pageDataUsage = js.match(/__PAGE_DATA[^;]{0,500}/g);
  if (pageDataUsage) {
    console.log('__PAGE_DATA usage:');
    pageDataUsage.forEach((m, i) => console.log(`  ${i + 1}:`, m.substring(0, 200)));
  }
  
  // Look for decode/decrypt functions
  const decodePatterns = [
    /function\s+\w*[dD]ecode[^{]*\{[^}]{0,500}/g,
    /function\s+\w*[dD]ecrypt[^{]*\{[^}]{0,500}/g,
    /atob\([^)]+\)/g,
    /btoa\([^)]+\)/g,
    /JSON\.parse\([^)]+\)/g,
  ];
  
  console.log('\n=== Decode patterns ===');
  for (const pattern of decodePatterns) {
    const matches = js.match(pattern);
    if (matches) {
      console.log(`Pattern ${pattern}:`);
      matches.slice(0, 3).forEach(m => console.log('  ', m.substring(0, 150)));
    }
  }
  
  // Look for base64 alphabet or custom encoding
  const base64Match = js.match(/[A-Za-z0-9+\/]{50,}/);
  if (base64Match) {
    console.log('\nPossible base64 alphabet:', base64Match[0].substring(0, 100));
  }
  
  // Save full JS for manual inspection
  require('fs').writeFileSync('megaup-app.js', js);
  console.log('\nSaved full JS to megaup-app.js');
}

main().catch(console.error);
