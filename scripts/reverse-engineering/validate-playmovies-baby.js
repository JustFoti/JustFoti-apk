#!/usr/bin/env node

/**
 * Validation script for yesmovies.baby-based 2embed sources
 * Tests both movies and TV shows to ensure 100% functionality
 */

const https = require('https');
const http = require('http');

// Test cases
const TEST_CASES = {
  movies: [
    { id: 550, title: 'Fight Club', year: 1999 },
    { id: 13, title: 'Forrest Gump', year: 1994 },
    { id: 680, title: 'Pulp Fiction', year: 1994 },
    { id: 155, title: 'The Dark Knight', year: 2008 },
    { id: 27205, title: 'Inception', year: 2010 }
  ],
  tvShows: [
    { id: 1396, season: 1, episode: 1, title: 'Breaking Bad', year: 2008 },
    { id: 1396, season: 5, episode: 14, title: 'Breaking Bad (Finale)', year: 2013 },
    { id: 1418, season: 1, episode: 1, title: 'The Big Bang Theory', year: 2007 },
    { id: 60059, season: 1, episode: 1, title: 'Better Call Saul', year: 2015 },
    { id: 2316, season: 1, episode: 1, title: 'The Office', year: 2005 }
  ]
};

/**
 * Fetch URL with redirect following
 */
function fetchWithRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const fetch = (currentUrl, redirectCount) => {
      const urlObj = new URL(currentUrl);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const options = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Referer': 'https://www.2embed.cc/'
        }
      };

      protocol.get(currentUrl, options, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectCount >= maxRedirects) {
            reject(new Error(`Too many redirects (${maxRedirects})`));
            return;
          }

          const redirectUrl = new URL(res.headers.location, currentUrl).href;
          console.log(`  → Redirect ${redirectCount + 1}: ${redirectUrl}`);
          fetch(redirectUrl, redirectCount + 1);
          return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            finalUrl: currentUrl
          });
        });
      }).on('error', reject);
    };

    fetch(url, 0);
  });
}

/**
 * Extract m3u8 URL from playmovies.baby response
 */
function extractM3U8(html) {
  // Look for m3u8 URLs in various formats
  const patterns = [
    /file:\s*["']([^"']*\.m3u8[^"']*)["']/,
    /source:\s*["']([^"']*\.m3u8[^"']*)["']/,
    /src:\s*["']([^"']*\.m3u8[^"']*)["']/,
    /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/,
    /"file":\s*"([^"]*\.m3u8[^"]*)"/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return null;
}

/**
 * Validate m3u8 URL is accessible
 */
async function validateM3U8(url) {
  try {
    const response = await fetchWithRedirects(url);
    
    if (response.statusCode !== 200) {
      return { valid: false, error: `HTTP ${response.statusCode}` };
    }

    const body = response.body;
    
    // Check if it's a valid m3u8 file
    if (!body.includes('#EXTM3U')) {
      return { valid: false, error: 'Not a valid m3u8 file' };
    }

    // Count quality variants
    const variants = (body.match(/#EXT-X-STREAM-INF/g) || []).length;
    const segments = (body.match(/#EXTINF/g) || []).length;

    return {
      valid: true,
      variants,
      segments,
      size: body.length
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Test movie extraction
 */
async function testMovie(movie) {
  console.log(`\n📽️  Testing Movie: ${movie.title} (${movie.year})`);
  console.log(`   TMDB ID: ${movie.id}`);

  const url = `https://playmovies.baby/movie/${movie.id}`;
  console.log(`   URL: ${url}`);

  try {
    const response = await fetchWithRedirects(url);
    
    if (response.statusCode !== 200) {
      console.log(`   ❌ Failed: HTTP ${response.statusCode}`);
      return { success: false, error: `HTTP ${response.statusCode}` };
    }

    const m3u8Url = extractM3U8(response.body);
    
    if (!m3u8Url) {
      console.log(`   ❌ Failed: No m3u8 URL found`);
      return { success: false, error: 'No m3u8 URL found' };
    }

    console.log(`   ✓ Found m3u8: ${m3u8Url.substring(0, 80)}...`);

    const validation = await validateM3U8(m3u8Url);
    
    if (!validation.valid) {
      console.log(`   ❌ Failed: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    console.log(`   ✅ SUCCESS!`);
    console.log(`      - Variants: ${validation.variants}`);
    console.log(`      - Segments: ${validation.segments}`);
    console.log(`      - Size: ${validation.size} bytes`);

    return {
      success: true,
      m3u8Url,
      validation
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test TV show extraction
 */
async function testTVShow(show) {
  console.log(`\n📺 Testing TV Show: ${show.title} S${show.season}E${show.episode}`);
  console.log(`   TMDB ID: ${show.id}`);

  const url = `https://playmovies.baby/tv/${show.id}/${show.season}/${show.episode}`;
  console.log(`   URL: ${url}`);

  try {
    const response = await fetchWithRedirects(url);
    
    if (response.statusCode !== 200) {
      console.log(`   ❌ Failed: HTTP ${response.statusCode}`);
      return { success: false, error: `HTTP ${response.statusCode}` };
    }

    const m3u8Url = extractM3U8(response.body);
    
    if (!m3u8Url) {
      console.log(`   ❌ Failed: No m3u8 URL found`);
      return { success: false, error: 'No m3u8 URL found' };
    }

    console.log(`   ✓ Found m3u8: ${m3u8Url.substring(0, 80)}...`);

    const validation = await validateM3U8(m3u8Url);
    
    if (!validation.valid) {
      console.log(`   ❌ Failed: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    console.log(`   ✅ SUCCESS!`);
    console.log(`      - Variants: ${validation.variants}`);
    console.log(`      - Segments: ${validation.segments}`);
    console.log(`      - Size: ${validation.size} bytes`);

    return {
      success: true,
      m3u8Url,
      validation
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  PLAYMOVIES.BABY 2EMBED SOURCE VALIDATION                     ║');
  console.log('║  Testing Movies and TV Shows for 100% Functionality           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const results = {
    movies: { total: 0, success: 0, failed: 0, results: [] },
    tvShows: { total: 0, success: 0, failed: 0, results: [] }
  };

  // Test Movies
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('                        TESTING MOVIES                          ');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const movie of TEST_CASES.movies) {
    results.movies.total++;
    const result = await testMovie(movie);
    results.movies.results.push({ ...movie, ...result });
    
    if (result.success) {
      results.movies.success++;
    } else {
      results.movies.failed++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test TV Shows
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('                       TESTING TV SHOWS                         ');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const show of TEST_CASES.tvShows) {
    results.tvShows.total++;
    const result = await testTVShow(show);
    results.tvShows.results.push({ ...show, ...result });
    
    if (result.success) {
      results.tvShows.success++;
    } else {
      results.tvShows.failed++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print Summary
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      VALIDATION SUMMARY                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  console.log('\n📽️  MOVIES:');
  console.log(`   Total:   ${results.movies.total}`);
  console.log(`   Success: ${results.movies.success} ✅`);
  console.log(`   Failed:  ${results.movies.failed} ❌`);
  console.log(`   Rate:    ${((results.movies.success / results.movies.total) * 100).toFixed(1)}%`);

  console.log('\n📺 TV SHOWS:');
  console.log(`   Total:   ${results.tvShows.total}`);
  console.log(`   Success: ${results.tvShows.success} ✅`);
  console.log(`   Failed:  ${results.tvShows.failed} ❌`);
  console.log(`   Rate:    ${((results.tvShows.success / results.tvShows.total) * 100).toFixed(1)}%`);

  const totalTests = results.movies.total + results.tvShows.total;
  const totalSuccess = results.movies.success + results.tvShows.success;
  const totalFailed = results.movies.failed + results.tvShows.failed;

  console.log('\n🎯 OVERALL:');
  console.log(`   Total:   ${totalTests}`);
  console.log(`   Success: ${totalSuccess} ✅`);
  console.log(`   Failed:  ${totalFailed} ❌`);
  console.log(`   Rate:    ${((totalSuccess / totalTests) * 100).toFixed(1)}%`);

  // Failed tests details
  if (totalFailed > 0) {
    console.log('\n\n❌ FAILED TESTS:');
    
    results.movies.results.filter(r => !r.success).forEach(r => {
      console.log(`   Movie: ${r.title} (${r.id}) - ${r.error}`);
    });
    
    results.tvShows.results.filter(r => !r.success).forEach(r => {
      console.log(`   TV: ${r.title} S${r.season}E${r.episode} (${r.id}) - ${r.error}`);
    });
  }

  console.log('\n');

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run validation
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
