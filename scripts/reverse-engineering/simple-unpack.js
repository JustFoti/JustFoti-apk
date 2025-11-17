const fs = require('fs');
const html = fs.readFileSync('debug-final-player.html', 'utf-8');

// Extract the full eval statement
const evalMatch = html.match(/eval\(function\(p,a,c,k,e,d\){while\(c--\)if\(k\[c\]\)p=p\.replace\(new RegExp\('\\\\b'\+c\.toString\(a\)\+'\\\\b','g'\),k\[c\]\);return p}\('([^']+)',(\d+),(\d+),'([^']+)'\.split\('\|'\)\)\)/);

if (!evalMatch) {
  console.log('No match found');
  process.exit(1);
}

const packed = evalMatch[1];
const radix = parseInt(evalMatch[2]);
const count = parseInt(evalMatch[3]);
const dictionary = evalMatch[4].split('|');

console.log(`Unpacking...`);
console.log(`  Packed length: ${packed.length}`);
console.log(`  Radix: ${radix}`);
console.log(`  Count: ${count}`);
console.log(`  Dictionary: ${dictionary.length} entries\n`);

// Unpack
let unpacked = packed;
for (let c = count - 1; c >= 0; c--) {
  if (dictionary[c]) {
    const regex = new RegExp('\\b' + c.toString(radix) + '\\b', 'g');
    unpacked = unpacked.replace(regex, dictionary[c]);
  }
}

fs.writeFileSync('debug-unpacked.js', unpacked);
console.log('✅ Saved unpacked code to debug-unpacked.js\n');

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
  console.log('No M3U8 URLs found, checking for video sources object...\n');
  
  // Look for the o object
  const oMatch = unpacked.match(/var o=\{[^}]+\}/);
  if (oMatch) {
    console.log('Found video sources object:');
    console.log(oMatch[0]);
  }
}
