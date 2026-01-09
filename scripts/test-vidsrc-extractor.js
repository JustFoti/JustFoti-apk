// Test the updated VidSrc extractor
require('dotenv').config({ path: '.env.local' });

// Set the env var to enable VidSrc
process.env.ENABLE_VIDSRC_PROVIDER = 'true';

async function testVidSrc() {
  console.log('Testing VidSrc extractor...\n');
  
  // Dynamic import to get the updated module
  const { extractVidSrcStreams } = await import('../app/lib/services/vidsrc-extractor.ts');
  
  // Test with Fight Club (TMDB ID 550)
  console.log('=== Testing Movie: Fight Club (550) ===');
  const movieResult = await extractVidSrcStreams('550', 'movie');
  
  console.log('\nResult:');
  console.log('  Success:', movieResult.success);
  console.log('  Sources:', movieResult.sources.length);
  
  if (movieResult.sources.length > 0) {
    console.log('\n  Sources:');
    for (const source of movieResult.sources) {
      console.log(`    - ${source.title}: ${source.status}`);
      console.log(`      URL: ${source.url.substring(0, 80)}...`);
    }
  }
  
  if (movieResult.error) {
    console.log('  Error:', movieResult.error);
  }
  
  // Test with a TV show
  console.log('\n\n=== Testing TV: Breaking Bad S1E1 (1396) ===');
  const tvResult = await extractVidSrcStreams('1396', 'tv', 1, 1);
  
  console.log('\nResult:');
  console.log('  Success:', tvResult.success);
  console.log('  Sources:', tvResult.sources.length);
  
  if (tvResult.sources.length > 0) {
    console.log('\n  Sources:');
    for (const source of tvResult.sources) {
      console.log(`    - ${source.title}: ${source.status}`);
      console.log(`      URL: ${source.url.substring(0, 80)}...`);
    }
  }
  
  if (tvResult.error) {
    console.log('  Error:', tvResult.error);
  }
}

testVidSrc().catch(console.error);
