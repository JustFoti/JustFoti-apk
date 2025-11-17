/**
 * Test hash extractor directly
 */

const fs = require('fs');

async function test() {
  // Import the hash extractor
  const { hashExtractor } = await import('../app/lib/services/rcp/hash-extractor.ts');
  
  // Read the HTML
  const html = fs.readFileSync('superembed-embed-page.html', 'utf-8');
  
  console.log('HTML length:', html.length);
  console.log('Contains Superembed:', html.includes('Superembed'));
  
  // Try to extract
  const hash = hashExtractor.extract(html, 'superembed', 'test-123');
  
  if (hash) {
    console.log('\n✓ Hash extracted:', hash.substring(0, 50) + '...');
  } else {
    console.log('\n✗ Hash extraction failed');
    
    // Get pattern stats
    const stats = hashExtractor.getPatternStats();
    console.log('\nPattern stats:');
    for (const [name, stat] of stats) {
      console.log(`  ${name}: ${stat.successes}/${stat.attempts}`);
    }
  }
}

test();
