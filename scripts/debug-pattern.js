/**
 * Debug the pattern matching
 */

const fs = require('fs');

const html = fs.readFileSync('superembed-embed-page.html', 'utf-8');

console.log('Testing pattern matching...\n');

// Test the exact pattern from hash-extractor
const providerName = 'Superembed';
const pattern = new RegExp(
  `data-hash\\s*=\\s*["']([^"']+)["'][^>]*>[\\s\\S]*?${providerName}`,
  'i'
);

console.log('Pattern:', pattern);
console.log('\nTesting against HTML...\n');

const match = html.match(pattern);

if (match) {
  console.log('✓ Match found!');
  console.log('Full match length:', match[0].length);
  console.log('Hash:', match[1].substring(0, 50) + '...');
  console.log('\nFull match (first 500 chars):');
  console.log(match[0].substring(0, 500));
} else {
  console.log('✗ No match');
  
  // Try simpler patterns
  console.log('\nTrying simpler patterns...\n');
  
  const simple1 = /data-hash="([^"]+)"[^>]*>Superembed/;
  const match1 = html.match(simple1);
  console.log('Simple pattern 1 (exact):', match1 ? '✓ MATCH' : '✗ NO MATCH');
  
  const simple2 = /data-hash="([^"]+)"[^>]*>[\s\S]{0,100}Superembed/;
  const match2 = html.match(simple2);
  console.log('Simple pattern 2 (with space):', match2 ? '✓ MATCH' : '✗ NO MATCH');
  
  if (match2) {
    console.log('Hash:', match2[1].substring(0, 50) + '...');
  }
}
