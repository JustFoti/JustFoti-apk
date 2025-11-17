/**
 * Test hash extraction pattern
 */

const fs = require('fs');

// Read the saved HTML
const html = fs.readFileSync('superembed-embed-page.html', 'utf-8');

console.log('HTML length:', html.length);
console.log('\nSearching for Superembed...\n');

// Test the pattern
const pattern = /data-hash\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?Superembed/i;
const match = html.match(pattern);

if (match) {
  console.log('✓ Pattern matched!');
  console.log('Hash:', match[1].substring(0, 50) + '...');
} else {
  console.log('✗ Pattern did not match');
  
  // Try to find Superembed in the HTML
  const superembedIndex = html.indexOf('Superembed');
  if (superembedIndex !== -1) {
    console.log('\nFound "Superembed" at index:', superembedIndex);
    console.log('Context (200 chars before and after):');
    const start = Math.max(0, superembedIndex - 200);
    const end = Math.min(html.length, superembedIndex + 200);
    console.log(html.substring(start, end));
  }
}
