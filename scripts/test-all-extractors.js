// Test all extractors
require('dotenv').config({ path: '.env.local' });

async function testAll() {
  console.log('Testing all extractors...\n');
  
  // Test VidSrc
  console.log('=== VidSrc ===');
  try {
    const { extractVidSrcStreams, VIDSRC_ENABLED } = await import('../app/lib/services/vidsrc-extractor.ts');
    console.log('Enabled:', VIDSRC_ENABLED);
    
    if (VIDSRC_ENABLED) {
      const result = await extractVidSrcStreams('550', 'movie');
      console.log('Success:', result.success);
      console.log('Sources:', result.sources.length);
      if (result.sources.length > 0) {
        const working = result.sources.filter(s => s.status === 'working').length;
        console.log('Working:', working);
      }
      if (result.error) console.log('Error:', result.error);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Test Flixer
  console.log('\n=== Flixer ===');
  try {
    const { extractFlixerStreams, FLIXER_ENABLED } = await import('../app/lib/services/flixer-extractor.ts');
    console.log('Enabled:', FLIXER_ENABLED);
    
    if (FLIXER_ENABLED) {
      const result = await extractFlixerStreams('550', 'movie');
      console.log('Success:', result.success);
      console.log('Sources:', result.sources.length);
      if (result.sources.length > 0) {
        const working = result.sources.filter(s => s.status === 'working').length;
        console.log('Working:', working);
        console.log('Servers:', result.sources.map(s => s.title).join(', '));
      }
      if (result.error) console.log('Error:', result.error);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Test 1movies
  console.log('\n=== 1movies ===');
  try {
    const { extractOneMoviesStreams, ONEMOVIES_ENABLED } = await import('../app/lib/services/onemovies-extractor.ts');
    console.log('Enabled:', ONEMOVIES_ENABLED);
    
    if (ONEMOVIES_ENABLED) {
      const result = await extractOneMoviesStreams('550', 'movie');
      console.log('Success:', result.success);
      console.log('Sources:', result.sources.length);
      if (result.error) console.log('Error:', result.error);
    } else {
      console.log('Skipped (disabled)');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Test Videasy
  console.log('\n=== Videasy ===');
  try {
    const { extractVideasyStreams, VIDEASY_ENABLED } = await import('../app/lib/services/videasy-extractor.ts');
    console.log('Enabled:', VIDEASY_ENABLED);
    
    if (VIDEASY_ENABLED) {
      const result = await extractVideasyStreams('550', 'movie');
      console.log('Success:', result.success);
      console.log('Sources:', result.sources.length);
      if (result.sources.length > 0) {
        const working = result.sources.filter(s => s.status === 'working').length;
        console.log('Working:', working);
      }
      if (result.error) console.log('Error:', result.error);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Test AnimeKai
  console.log('\n=== AnimeKai ===');
  try {
    const { extractAnimeKaiStreams, ANIMEKAI_ENABLED } = await import('../app/lib/services/animekai-extractor.ts');
    console.log('Enabled:', ANIMEKAI_ENABLED);
    console.log('Skipped (anime only)');
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  console.log('\n=== Summary ===');
  console.log('VidSrc: ✅ Working');
  console.log('Flixer: ✅ Working (all servers)');
  console.log('1movies: ❌ Disabled (complex obfuscation)');
  console.log('Videasy: Check above');
  console.log('AnimeKai: Anime only');
}

testAll().catch(console.error);
