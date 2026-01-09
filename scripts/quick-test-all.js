// Quick test for all extractors
require('dotenv').config({ path: '.env.local' });

const TEST_MOVIE = '550'; // Fight Club
const TEST_TV = { id: '1396', season: 1, episode: 1 }; // Breaking Bad
const TEST_ANIME = { id: '37854', season: 1, episode: 1 }; // One Piece

async function testVideasy() {
  console.log('\n' + '='.repeat(50));
  console.log('VIDEASY');
  console.log('='.repeat(50));
  
  try {
    const { extractVideasyStreams } = await import('../app/lib/services/videasy-extractor.ts');
    const result = await extractVideasyStreams(TEST_MOVIE, 'movie');
    console.log('Success:', result.success);
    console.log('Sources:', result.sources.length);
    console.log('Working:', result.sources.filter(s => s.status === 'working').length);
    if (result.error) console.log('Error:', result.error);
    if (result.sources[0]?.url) console.log('URL:', result.sources[0].url.substring(0, 60));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

async function test1Movies() {
  console.log('\n' + '='.repeat(50));
  console.log('1MOVIES');
  console.log('='.repeat(50));
  
  try {
    const { extractOneMoviesStreams, ONEMOVIES_ENABLED } = await import('../app/lib/services/onemovies-extractor.ts');
    console.log('Enabled:', ONEMOVIES_ENABLED);
    if (!ONEMOVIES_ENABLED) return;
    
    const result = await extractOneMoviesStreams(TEST_MOVIE, 'movie');
    console.log('Success:', result.success);
    console.log('Sources:', result.sources.length);
    console.log('Working:', result.sources.filter(s => s.status === 'working').length);
    if (result.error) console.log('Error:', result.error);
    if (result.sources[0]?.url) console.log('URL:', result.sources[0].url.substring(0, 60));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

async function testFlixer() {
  console.log('\n' + '='.repeat(50));
  console.log('FLIXER');
  console.log('='.repeat(50));
  
  try {
    const { extractFlixerStreams, FLIXER_ENABLED } = await import('../app/lib/services/flixer-extractor.ts');
    console.log('Enabled:', FLIXER_ENABLED);
    if (!FLIXER_ENABLED) return;
    
    const result = await extractFlixerStreams(TEST_MOVIE, 'movie');
    console.log('Success:', result.success);
    console.log('Sources:', result.sources.length);
    if (result.error) console.log('Error:', result.error);
    if (result.sources[0]?.url) console.log('URL:', result.sources[0].url.substring(0, 60));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

async function testVidSrc() {
  console.log('\n' + '='.repeat(50));
  console.log('VIDSRC');
  console.log('='.repeat(50));
  
  try {
    const { extractVidSrcStreams, VIDSRC_ENABLED } = await import('../app/lib/services/vidsrc-extractor.ts');
    console.log('Enabled:', VIDSRC_ENABLED);
    if (!VIDSRC_ENABLED) {
      console.log('(Set ENABLE_VIDSRC_PROVIDER=true to enable)');
      return;
    }
    
    const result = await extractVidSrcStreams(TEST_MOVIE, 'movie');
    console.log('Success:', result.success);
    console.log('Sources:', result.sources.length);
    if (result.error) console.log('Error:', result.error);
    if (result.sources[0]?.url) console.log('URL:', result.sources[0].url.substring(0, 60));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

async function testAnimeKai() {
  console.log('\n' + '='.repeat(50));
  console.log('ANIMEKAI');
  console.log('='.repeat(50));
  
  try {
    const { extractAnimeKaiStreams, ANIMEKAI_ENABLED } = await import('../app/lib/services/animekai-extractor.ts');
    console.log('Enabled:', ANIMEKAI_ENABLED);
    if (!ANIMEKAI_ENABLED) return;
    
    console.log('Testing One Piece S1E1...');
    const result = await extractAnimeKaiStreams(TEST_ANIME.id, 'tv', TEST_ANIME.season, TEST_ANIME.episode);
    console.log('Success:', result.success);
    console.log('Sources:', result.sources.length);
    console.log('Working:', result.sources.filter(s => s.status === 'working').length);
    if (result.error) console.log('Error:', result.error);
    if (result.sources[0]?.url) console.log('URL:', result.sources[0].url.substring(0, 60));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

async function main() {
  console.log('EXTRACTOR TEST SUITE');
  console.log('TMDB API Key:', process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'SET' : 'NOT SET');
  console.log('CF Proxy:', process.env.NEXT_PUBLIC_CF_STREAM_PROXY_URL ? 'SET' : 'NOT SET');
  
  await testVideasy();
  await test1Movies();
  await testFlixer();
  await testVidSrc();
  await testAnimeKai();
  
  console.log('\n' + '='.repeat(50));
  console.log('DONE');
  console.log('='.repeat(50));
}

main();
