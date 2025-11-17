/**
 * Test with HTML from HTTP client
 */

const fs = require('fs');

const html1 = fs.readFileSync('superembed-embed-page.html', 'utf-8');
const html2 = fs.readFileSync('superembed-from-http-client.html', 'utf-8');

console.log('HTML from fetchPage:', html1.length);
console.log('HTML from HTTP client:', html2.length);
console.log('Are they equal?', html1 === html2);

if (html1 !== html2) {
  console.log('\nDifferences found!');
  console.log('First 100 chars of fetchPage HTML:');
  console.log(html1.substring(0, 100));
  console.log('\nFirst 100 chars of HTTP client HTML:');
  console.log(html2.substring(0, 100));
}

// Test pattern on both
const pattern = /data-hash\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?Superembed/i;

const match1 = html1.match(pattern);
const match2 = html2.match(pattern);

console.log('\nPattern test on fetchPage HTML:', match1 ? '✓ MATCH' : '✗ NO MATCH');
console.log('Pattern test on HTTP client HTML:', match2 ? '✓ MATCH' : '✗ NO MATCH');
