#!/usr/bin/env node
/**
 * Test anime detection API
 */

const TMDB_API_KEY = 'b89acdd87e12c283f56feb2e016b4964';

async function checkAnime(tmdbId, type) {
  console.log(`\nChecking ${type} ${tmdbId}...`);
  
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    console.log(`  TMDB API error: ${response.status}`);
    return;
  }
  
  const data = await response.json();
  
  const hasAnimationGenre = data.genres?.some(g => g.id === 16) || false;
  const isJapaneseOrigin = data.origin_country?.includes('JP') || data.original_language === 'ja';
  const isAnime = hasAnimationGenre && isJapaneseOrigin;
  
  console.log(`  Title: ${data.name || data.title}`);
  console.log(`  Genres: ${data.genres?.map(g => g.name).join(', ')}`);
  console.log(`  Origin: ${data.origin_country?.join(', ') || 'N/A'}`);
  console.log(`  Language: ${data.original_language}`);
  console.log(`  Has Animation: ${hasAnimationGenre}`);
  console.log(`  Is Japanese: ${isJapaneseOrigin}`);
  console.log(`  IS ANIME: ${isAnime ? '✓ YES' : '✗ NO'}`);
  
  return isAnime;
}

async function main() {
  console.log('=== Testing Anime Detection ===');
  
  // Test known anime
  await checkAnime(85937, 'tv');   // Demon Slayer
  await checkAnime(37854, 'tv');   // One Piece
  await checkAnime(31911, 'tv');   // Attack on Titan
  await checkAnime(1429, 'tv');    // Attack on Titan (alternate ID)
  await checkAnime(46260, 'tv');   // Naruto
  await checkAnime(114410, 'tv');  // Chainsaw Man
  await checkAnime(94605, 'tv');   // Arcane (not anime - American)
  await checkAnime(1399, 'tv');    // Game of Thrones (not anime)
  
  // Test anime movies
  await checkAnime(372058, 'movie'); // Your Name
  await checkAnime(129, 'movie');    // Spirited Away
}

main().catch(console.error);
