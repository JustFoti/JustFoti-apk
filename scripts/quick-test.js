// Quick test for Videasy extractor
require('dotenv').config({ path: '.env.local' });

const TEST_MOVIE = '550'; // Fight Club

async function test() {
  console.log('Testing Videasy extractor...');
  console.log('TMDB API Key:', process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'SET' : 'NOT SET');
  
  try {
    // Dynamic import for ESM module
    const videasyModule = await import('../app/lib/services/videasy-extractor.ts');
    const { extractVideasyStreams } = videasyModule;
    
    console.log('\nTesting movie extraction for Fight Club (550)...');
    const result = await extractVideasyStreams(TEST_MOVIE, 'movie');
    
    console.log('\nResult:');
    console.log('  Success:', result.success);
    console.log('  Sources:', result.sources.length);
    console.log('  Error:', result.error || 'none');
    
    if (result.sources.length > 0) {
      console.log('\nFirst source:');
      console.log('  Title:', result.sources[0].title);
      console.log('  URL:', result.sources[0].url?.substring(0, 80) || 'none');
      console.log('  Status:', result.sources[0].status);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

test();
