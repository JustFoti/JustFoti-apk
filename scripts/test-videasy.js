// Test Videasy extractor
require('dotenv').config({ path: '.env.local' });

async function testVideasy() {
  console.log('Testing Videasy extractor...\n');
  
  try {
    const { extractVideasyStreams } = await import('../app/lib/services/videasy-extractor.ts');
    
    const result = await extractVideasyStreams('550', 'movie');
    console.log('Success:', result.success);
    console.log('Sources:', result.sources.length);
    
    if (result.sources.length > 0) {
      console.log('\nSources:');
      for (const source of result.sources) {
        console.log(`  - ${source.title}: ${source.status || 'unknown'}`);
        console.log(`    URL: ${source.url?.substring(0, 80) || 'N/A'}...`);
      }
    }
    
    if (result.error) {
      console.log('Error:', result.error);
    }
  } catch (e) {
    console.log('Error:', e.message);
    console.log(e.stack);
  }
}

testVideasy().catch(console.error);
