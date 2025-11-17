/**
 * Extract M3U8 URLs from obfuscated JWPlayer config
 */

const fs = require('fs');

// Read the HTML file
const html = fs.readFileSync('debug-final-player.html', 'utf-8');

// The obfuscated script uses a packer - let's extract the packed data
// Pattern: eval(function(p,a,c,k,e,d){...}('PACKED_DATA',36,458,'DICTIONARY'...))

const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\){[^}]+}\('([^']+)',(\d+),(\d+),'([^']+)'\)/);

if (!packedMatch) {
  console.log('No packed script found');
  console.log('Trying alternative pattern...');
  
  // Try to extract just the dictionary
  const dictMatch = html.match(/'([^']+)'\.split\('\|'\)\)\)/);
  if (dictMatch) {
    const dictionary = dictMatch[1].split('|');
    console.log(`Found dictionary with ${dictionary.length} entries`);
    
    // Look for the packed data before it
    const fullMatch = html.match(/}\('([^']+)',36,\d+,'([^']+)'\.split/);
    if (fullMatch) {
      const packed = fullMatch[1];
      const dict = fullMatch[2].split('|');
      
      console.log(`Found packed data (${packed.length} chars)`);
      console.log(`Dictionary: ${dict.length} entries\n`);
      
      // Unpack
      function unpack(p, a, c, k) {
        while (c--) {
          if (k[c]) {
            p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
          }
        }
        return p;
      }
      
      const unpacked = unpack(packed, 36, dict.length, dict);
      fs.writeFileSync('debug-unpacked.js', unpacked);
      console.log('Saved unpacked code\n');
      
      // Extract M3U8 URLs
      const m3u8Pattern = /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g;
      const m3u8Matches = unpacked.match(m3u8Pattern);
      
      if (m3u8Matches) {
        console.log('🎯 FOUND M3U8 URLs:');
        const uniqueUrls = [...new Set(m3u8Matches)];
        uniqueUrls.forEach((url, i) => {
          console.log(`  ${i + 1}. ${url}`);
        });
      }
      
      process.exit(0);
    }
  }
  
  console.log('Could not find packed script');
  process.exit(1);
}

const packed = packedMatch[1];
const radix = parseInt(packedMatch[2]);
const count = parseInt(packedMatch[3]);
const dictionary = packedMatch[4].split('|');

console.log(`Found packed script:`);
console.log(`  Radix: ${radix}`);
console.log(`  Count: ${count}`);
console.log(`  Dictionary entries: ${dictionary.length}\n`);

// Unpack function (standard Dean Edwards packer)
function unpack(p, a, c, k) {
  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
    }
  }
  return p;
}

try {
  const unpacked = unpack(packed, radix, count, dictionary);
  
  fs.writeFileSync('debug-unpacked.js', unpacked);
  console.log('Saved unpacked code to debug-unpacked.js\n');
  
  // Extract M3U8 URLs
  const m3u8Pattern = /https?:\/\/[^\s"']+\.m3u8[^\s"']*/g;
  const m3u8Matches = unpacked.match(m3u8Pattern);
  
  if (m3u8Matches) {
    console.log('🎯 FOUND M3U8 URLs:');
    const uniqueUrls = [...new Set(m3u8Matches)];
    uniqueUrls.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
  } else {
    console.log('No direct M3U8 URLs found');
    
    // Look for the video sources object
    const sourcesMatch = unpacked.match(/var\s+o\s*=\s*\{([^}]+)\}/);
    if (sourcesMatch) {
      console.log('\n📦 Found video sources object:');
      console.log(sourcesMatch[0].substring(0, 500));
    }
    
    // Look for any URL patterns
    const urlPattern = /["'](https?:\/\/[^"']+)["']/g;
    const urls = [...unpacked.matchAll(urlPattern)];
    if (urls.length > 0) {
      console.log('\n🔗 Found URLs in unpacked code:');
      urls.slice(0, 10).forEach((match, i) => {
        console.log(`  ${i + 1}. ${match[1]}`);
      });
    }
  }
  
} catch (e) {
  console.error('Error unpacking:', e.message);
}
