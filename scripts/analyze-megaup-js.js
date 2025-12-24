#!/usr/bin/env node
const fs = require('fs');
const js = fs.readFileSync('megaup-app.js', 'utf8');

console.log('JS length:', js.length);

// Look for source setup patterns
const patterns = [
  { name: 'file:', regex: /file\s*:/ },
  { name: 'sources:', regex: /sources\s*:/ },
  { name: '.setup(', regex: /\.setup\s*\(/ },
  { name: 'jwplayer', regex: /jwplayer/ },
  { name: 'charCodeAt', regex: /charCodeAt/ },
  { name: 'fromCharCode', regex: /fromCharCode/ },
  { name: 'atob', regex: /atob/ },
  { name: 'btoa', regex: /btoa/ },
];

for (const p of patterns) {
  const matches = js.match(new RegExp(p.regex.source, 'g'));
  if (matches) {
    console.log(`\n${p.name}: ${matches.length} occurrences`);
    // Find first occurrence with context
    const idx = js.search(p.regex);
    if (idx >= 0) {
      console.log('  Context:', js.substring(Math.max(0, idx - 50), idx + 150).replace(/\n/g, ' '));
    }
  }
}

// Look for the decode function - usually near __PAGE_DATA or window.
console.log('\n=== Looking for window. assignments ===');
const windowAssigns = js.match(/window\.[a-zA-Z_]+\s*=/g);
if (windowAssigns) {
  console.log('Window assignments:', [...new Set(windowAssigns)].slice(0, 20));
}

// Look for base64-like strings (custom alphabet)
console.log('\n=== Looking for custom alphabets ===');
const alphabets = js.match(/['\"][A-Za-z0-9+\/]{50,}['\"]/) ;
if (alphabets) {
  console.log('Found:', alphabets[0].substring(0, 100));
}
