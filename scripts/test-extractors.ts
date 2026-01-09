#!/usr/bin/env npx ts-node
/**
 * Media Extractor Test Script
 * 
 * Tests all extractors: VidSrc, Flixer, 1movies, Videasy, AnimeKai
 * 
 * Usage:
 *   npx ts-node scripts/test-extractors.ts
 *   
 * Or with specific provider:
 *   npx ts-node scripts/test-extractors.ts --provider=vidsrc
 *   npx ts-node scripts/test-extractors.ts --provider=flixer
 *   npx ts-node scripts/test-extractors.ts --provider=1movies
 *   npx ts-node scripts/test-extractors.ts --provider=videasy
 *   npx ts-node scripts/test-extractors.ts --provider=animekai
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Test content IDs
const TEST_CONTENT = {
  // Movies
  movie: {
    tmdbId: '550', // Fight Club
    title: 'Fight Club',
  },
  // TV Shows
  tv: {
    tmdbId: '1396', // Breaking Bad
    title: 'Breaking Bad',
    season: 1,
    episode: 1,
  },
  // Anime
  anime: {
    tmdbId: '37854', // One Piece
    title: 'One Piece',
    season: 1,
    episode: 1,
  },
};

interface TestResult {
  provider: string;
  contentType: string;
  success: boolean;
  sourcesCount: number;
  workingCount: number;
  error?: string;
  duration: number;
  sources?: Array<{
    title: string;
    url: string;
    status: string;
  }>;
}

const results: TestResult[] = [];

async function testVidSrc(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Testing VidSrc Extractor');
  console.log('='.repeat(60));

  const { extractVidSrcStreams, VIDSRC_ENABLED } = await import('../app/lib/services/vidsrc-extractor');

  if (!VIDSRC_ENABLED) {
    console.log('⚠️  VidSrc is DISABLED (set ENABLE_VIDSRC_PROVIDER=true to enable)');
    results.push({
      provider: 'vidsrc',
      contentType: 'movie',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: 'Provider disabled',
      duration: 0,
    });
    return;
  }

  // Test movie
  console.log(`\nTesting movie: ${TEST_CONTENT.movie.title} (${TEST_CONTENT.movie.tmdbId})`);
  const movieStart = Date.now();
  try {
    const movieResult = await extractVidSrcStreams(TEST_CONTENT.movie.tmdbId, 'movie');
    const movieDuration = Date.now() - movieStart;
    const workingCount = movieResult.sources.filter(s => s.status === 'working').length;
    
    console.log(`  ✓ Success: ${movieResult.sources.length} sources (${workingCount} working) in ${movieDuration}ms`);
    movieResult.sources.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.title || s.quality} - ${s.status || 'unknown'}`);
      if (s.url) console.log(`       URL: ${s.url.substring(0, 80)}...`);
    });
    
    results.push({
      provider: 'vidsrc',
      contentType: 'movie',
      success: movieResult.success,
      sourcesCount: movieResult.sources.length,
      workingCount,
      duration: movieDuration,
      sources: movieResult.sources.map(s => ({
        title: s.title || s.quality,
        url: s.url?.substring(0, 60) || '',
        status: s.status || 'unknown',
      })),
    });
  } catch (error) {
    const movieDuration = Date.now() - movieStart;
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    results.push({
      provider: 'vidsrc',
      contentType: 'movie',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: movieDuration,
    });
  }

  // Test TV
  console.log(`\nTesting TV: ${TEST_CONTENT.tv.title} S${TEST_CONTENT.tv.season}E${TEST_CONTENT.tv.episode}`);
  const tvStart = Date.now();
  try {
    const tvResult = await extractVidSrcStreams(
      TEST_CONTENT.tv.tmdbId,
      'tv',
      TEST_CONTENT.tv.season,
      TEST_CONTENT.tv.episode
    );
    const tvDuration = Date.now() - tvStart;
    const workingCount = tvResult.sources.filter(s => s.status === 'working').length;
    
    console.log(`  ✓ Success: ${tvResult.sources.length} sources (${workingCount} working) in ${tvDuration}ms`);
    
    results.push({
      provider: 'vidsrc',
      contentType: 'tv',
      success: tvResult.success,
      sourcesCount: tvResult.sources.length,
      workingCount,
      duration: tvDuration,
    });
  } catch (error) {
    const tvDuration = Date.now() - tvStart;
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    results.push({
      provider: 'vidsrc',
      contentType: 'tv',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: tvDuration,
    });
  }
}

async function testFlixer(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Flixer Extractor');
  console.log('='.repeat(60));

  const { extractFlixerStreams, FLIXER_ENABLED } = await import('../app/lib/services/flixer-extractor');

  if (!FLIXER_ENABLED) {
    console.log('⚠️  Flixer is DISABLED');
    results.push({
      provider: 'flixer',
      contentType: 'movie',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: 'Provider disabled',
      duration: 0,
    });
    return;
  }

  // Test movie
  console.log(`\nTesting movie: ${TEST_CONTENT.movie.title} (${TEST_CONTENT.movie.tmdbId})`);
  const movieStart = Date.now();
  try {
    const movieResult = await extractFlixerStreams(TEST_CONTENT.movie.tmdbId, 'movie');
    const movieDuration = Date.now() - movieStart;
    const workingCount = movieResult.sources.filter(s => s.status === 'working').length;
    
    console.log(`  ✓ Success: ${movieResult.sources.length} sources (${workingCount} working) in ${movieDuration}ms`);
    movieResult.sources.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.title || s.quality} - ${s.status || 'unknown'}`);
      if (s.url) console.log(`       URL: ${s.url.substring(0, 80)}...`);
    });
    
    results.push({
      provider: 'flixer',
      contentType: 'movie',
      success: movieResult.success,
      sourcesCount: movieResult.sources.length,
      workingCount,
      duration: movieDuration,
    });
  } catch (error) {
    const movieDuration = Date.now() - movieStart;
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    results.push({
      provider: 'flixer',
      contentType: 'movie',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: movieDuration,
    });
  }

  // Test TV
  console.log(`\nTesting TV: ${TEST_CONTENT.tv.title} S${TEST_CONTENT.tv.season}E${TEST_CONTENT.tv.episode}`);
  const tvStart = Date.now();
  try {
    const tvResult = await extractFlixerStreams(
      TEST_CONTENT.tv.tmdbId,
      'tv',
      TEST_CONTENT.tv.season,
      TEST_CONTENT.tv.episode
    );
    const tvDuration = Date.now() - tvStart;
    const workingCount = tvResult.sources.filter(s => s.status === 'working').length;
    
    console.log(`  ✓ Success: ${tvResult.sources.length} sources (${workingCount} working) in ${tvDuration}ms`);
    
    results.push({
      provider: 'flixer',
      contentType: 'tv',
      success: tvResult.success,
      sourcesCount: tvResult.sources.length,
      workingCount,
      duration: tvDuration,
    });
  } catch (error) {
    const tvDuration = Date.now() - tvStart;
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    results.push({
      provider: 'flixer',
      contentType: 'tv',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: tvDuration,
    });
  }
}

async function test1Movies(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Testing 1movies Extractor');
  console.log('='.repeat(60));

  const { extractOneMoviesStreams, ONEMOVIES_ENABLED } = await import('../app/lib/services/onemovies-extractor');

  if (!ONEMOVIES_ENABLED) {
    console.log('⚠️  1movies is DISABLED');
    results.push({
      provider: '1movies',
      contentType: 'movie',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: 'Provider disabled',
      duration: 0,
    });
    return;
  }

  // Test movie
  console.log(`\nTesting movie: ${TEST_CONTENT.movie.title} (${TEST_CONTENT.movie.tmdbId})`);
  const movieStart = Date.now();
  try {
    const movieResult = await extractOneMoviesStreams(TEST_CONTENT.movie.tmdbId, 'movie');
    const movieDuration = Date.now() - movieStart;
    const workingCount = movieResult.sources.filter(s => s.status === 'working').length;
    
    console.log(`  ✓ Success: ${movieResult.sources.length} sources (${workingCount} working) in ${movieDuration}ms`);
    movieResult.sources.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.title || s.quality} - ${s.status || 'unknown'}`);
      if (s.url) console.log(`       URL: ${s.url.substring(0, 80)}...`);
    });
    
    results.push({
      provider: '1movies',
      contentType: 'movie',
      success: movieResult.success,
      sourcesCount: movieResult.sources.length,
      workingCount,
      duration: movieDuration,
    });
  } catch (error) {
    const movieDuration = Date.now() - movieStart;
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    results.push({
      provider: '1movies',
      contentType: 'movie',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: movieDuration,
    });
  }

  // Test TV
  console.log(`\nTesting TV: ${TEST_CONTENT.tv.title} S${TEST_CONTENT.tv.season}E${TEST_CONTENT.tv.episode}`);
  const tvStart = Date.now();
  try {
    const tvResult = await extractOneMoviesStreams(
      TEST_CONTENT.tv.tmdbId,
      'tv',
      TEST_CONTENT.tv.season,
      TEST_CONTENT.tv.episode
    );
    const tvDuration = Date.now() - tvStart;
    const workingCount = tvResult.sources.filter(s => s.status === 'working').length;
    
    console.log(`  ✓ Success: ${tvResult.sources.length} sources (${workingCount} working) in ${tvDuration}ms`);
    
    results.push({
      provider: '1movies',
      contentType: 'tv',
      success: tvResult.success,
      sourcesCount: tvResult.sources.length,
      workingCount,
      duration: tvDuration,
    });
  } catch (error) {
    const tvDuration = Date.now() - tvStart;
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    results.push({
      provider: '1movies',
      contentType: 'tv',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: tvDuration,
    });
  }
}

async function testVideasy(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Videasy Extractor');
  console.log('='.repeat(60));

  const { extractVideasyStreams } = await import('../app/lib/services/videasy-extractor');

  // Test movie
  console.log(`\nTesting movie: ${TEST_CONTENT.movie.title} (${TEST_CONTENT.movie.tmdbId})`);
  const movieStart = Date.now();
  try {
    const movieResult = await extractVideasyStreams(TEST_CONTENT.movie.tmdbId, 'movie');
    const movieDuration = Date.now() - movieStart;
    const workingCount = movieResult.sources.filter(s => s.status === 'working').length;
    
    console.log(`  ✓ Success: ${movieResult.sources.length} sources (${workingCount} working) in ${movieDuration}ms`);
    movieResult.sources.slice(0, 5).forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.title || s.quality} - ${s.status || 'unknown'} [${s.language || 'en'}]`);
      if (s.url) console.log(`       URL: ${s.url.substring(0, 80)}...`);
    });
    if (movieResult.sources.length > 5) {
      console.log(`    ... and ${movieResult.sources.length - 5} more sources`);
    }
    
    results.push({
      provider: 'videasy',
      contentType: 'movie',
      success: movieResult.success,
      sourcesCount: movieResult.sources.length,
      workingCount,
      duration: movieDuration,
    });
  } catch (error) {
    const movieDuration = Date.now() - movieStart;
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    results.push({
      provider: 'videasy',
      contentType: 'movie',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: movieDuration,
    });
  }

  // Test TV
  console.log(`\nTesting TV: ${TEST_CONTENT.tv.title} S${TEST_CONTENT.tv.season}E${TEST_CONTENT.tv.episode}`);
  const tvStart = Date.now();
  try {
    const tvResult = await extractVideasyStreams(
      TEST_CONTENT.tv.tmdbId,
      'tv',
      TEST_CONTENT.tv.season,
      TEST_CONTENT.tv.episode
    );
    const tvDuration = Date.now() - tvStart;
    const workingCount = tvResult.sources.filter(s => s.status === 'working').length;
    
    console.log(`  ✓ Success: ${tvResult.sources.length} sources (${workingCount} working) in ${tvDuration}ms`);
    
    results.push({
      provider: 'videasy',
      contentType: 'tv',
      success: tvResult.success,
      sourcesCount: tvResult.sources.length,
      workingCount,
      duration: tvDuration,
    });
  } catch (error) {
    const tvDuration = Date.now() - tvStart;
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    results.push({
      provider: 'videasy',
      contentType: 'tv',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: tvDuration,
    });
  }
}

async function testAnimeKai(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('Testing AnimeKai Extractor');
  console.log('='.repeat(60));

  const { extractAnimeKaiStreams, ANIMEKAI_ENABLED } = await import('../app/lib/services/animekai-extractor');

  if (!ANIMEKAI_ENABLED) {
    console.log('⚠️  AnimeKai is DISABLED');
    results.push({
      provider: 'animekai',
      contentType: 'anime',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: 'Provider disabled',
      duration: 0,
    });
    return;
  }

  // Test anime
  console.log(`\nTesting anime: ${TEST_CONTENT.anime.title} S${TEST_CONTENT.anime.season}E${TEST_CONTENT.anime.episode}`);
  const animeStart = Date.now();
  try {
    const animeResult = await extractAnimeKaiStreams(
      TEST_CONTENT.anime.tmdbId,
      'tv',
      TEST_CONTENT.anime.season,
      TEST_CONTENT.anime.episode
    );
    const animeDuration = Date.now() - animeStart;
    const workingCount = animeResult.sources.filter(s => s.status === 'working').length;
    
    console.log(`  ✓ Success: ${animeResult.sources.length} sources (${workingCount} working) in ${animeDuration}ms`);
    animeResult.sources.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.title || s.quality} - ${s.status || 'unknown'} [${s.language || 'ja'}]`);
      if (s.url) console.log(`       URL: ${s.url.substring(0, 80)}...`);
    });
    
    results.push({
      provider: 'animekai',
      contentType: 'anime',
      success: animeResult.success,
      sourcesCount: animeResult.sources.length,
      workingCount,
      duration: animeDuration,
    });
  } catch (error) {
    const animeDuration = Date.now() - animeStart;
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
    results.push({
      provider: 'animekai',
      contentType: 'anime',
      success: false,
      sourcesCount: 0,
      workingCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: animeDuration,
    });
  }
}

function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const providers = ['vidsrc', 'flixer', '1movies', 'videasy', 'animekai'];
  
  for (const provider of providers) {
    const providerResults = results.filter(r => r.provider === provider);
    if (providerResults.length === 0) continue;
    
    const allSuccess = providerResults.every(r => r.success);
    const totalSources = providerResults.reduce((sum, r) => sum + r.sourcesCount, 0);
    const totalWorking = providerResults.reduce((sum, r) => sum + r.workingCount, 0);
    const avgDuration = Math.round(providerResults.reduce((sum, r) => sum + r.duration, 0) / providerResults.length);
    
    const status = allSuccess ? '✓' : '✗';
    const statusColor = allSuccess ? '\x1b[32m' : '\x1b[31m';
    
    console.log(`${statusColor}${status}\x1b[0m ${provider.toUpperCase().padEnd(12)} | Sources: ${totalSources.toString().padStart(2)} | Working: ${totalWorking.toString().padStart(2)} | Avg: ${avgDuration}ms`);
    
    for (const r of providerResults) {
      if (r.error) {
        console.log(`    └─ ${r.contentType}: ${r.error}`);
      }
    }
  }
  
  console.log('\n' + '-'.repeat(60));
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  console.log(`Total: ${passedTests}/${totalTests} tests passed`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const providerArg = args.find(a => a.startsWith('--provider='));
  const provider = providerArg ? providerArg.split('=')[1] : 'all';
  
  console.log('Media Extractor Test Suite');
  console.log('==========================');
  console.log(`Provider: ${provider}`);
  console.log(`TMDB API Key: ${process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'Set' : 'NOT SET'}`);
  console.log(`CF Stream Proxy: ${process.env.NEXT_PUBLIC_CF_STREAM_PROXY_URL ? 'Set' : 'NOT SET'}`);
  
  try {
    if (provider === 'all' || provider === 'vidsrc') {
      await testVidSrc();
    }
    if (provider === 'all' || provider === 'flixer') {
      await testFlixer();
    }
    if (provider === 'all' || provider === '1movies') {
      await test1Movies();
    }
    if (provider === 'all' || provider === 'videasy') {
      await testVideasy();
    }
    if (provider === 'all' || provider === 'animekai') {
      await testAnimeKai();
    }
    
    printSummary();
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  }
}

main();
