/**
 * Deobfuscate JWPlayer config from yesmovies.baby
 */

const fs = require('fs');

// Read the HTML file
const html = fs.readFileSync('debug-final-player.html', 'utf-8');

// Extract the obfuscated script
const scriptMatch = html.match(/eval\(function\(p,a,c,k,e,d\){[^}]+}\('([^']+)'/);

if (!scriptMatch) {
  console.log('No obfuscated script found');
  process.exit(1);
}

const obfuscated = scriptMatch[0];

console.log('Found obfuscated script, executing...\n');

// Execute the eval to deobfuscate
try {
  const deobfuscated = eval(obfuscated);
  
  // Save deobfuscated code
  fs.writeFileSync('debug-deobfuscated.js', deobfuscated);
  console.log('Saved deobfuscated code to debug-deobfuscated.js\n');
  
  // Extract M3U8 URLs from deobfuscated code
  const m3u8Pattern = /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g;
  const m3u8Matches = deobfuscated.match(m3u8Pattern);
  
  if (m3u8Matches) {
    console.log('🎯 FOUND M3U8 URLs:');
    m3u8Matches.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
  } else {
    console.log('No M3U8 URLs found in deobfuscated code');
    
    // Look for the 'o' object definition
    const oMatch = deobfuscated.match(/var o=\{([^}]+)\}/);
    if (oMatch) {
      console.log('\nFound video sources object:');
      console.log(oMatch[0]);
    }
  }
  
} catch (e) {
  console.error('Error deobfuscating:', e.message);
}
