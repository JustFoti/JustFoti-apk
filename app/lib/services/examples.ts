/**
 * Service Usage Examples
 * Demonstrates how to use the core service adapters
 */

import { tmdbService } from './tmdb';
import { extractorService } from './extractor';
import { analyticsService } from './analytics';

/**
 * Example: Browse and watch a movie
 */
export async function browseAndWatchMovie() {
  try {
    // 1. Get trending movies
    const trending = await tmdbService.getTrending('movie', 'week');
    console.log('Trending movies:', trending.length);

    // 2. Track page view
    analyticsService.trackPageView('/');

    // 3. Get movie details
    const movie = trending[0];
    const details = await tmdbService.getMovieDetails(movie.id);
    console.log('Movie details:', details.title);

    // 4. Track content view
    analyticsService.trackContentView(details.id, 'movie', details.title);

    // 5. Extract video stream
    const videoData = await extractorService.extractMovie(details.id);
    console.log('Video sources:', videoData.sources.length);

    // 6. Track playback start
    analyticsService.trackPlay(details.id, 'movie', 0, details.runtime || 0, '1080p');

    return { details, videoData };
  } catch (error) {
    console.error('Error browsing movie:', error);
    throw error;
  }
}

/**
 * Example: Search and watch a TV show episode
 */
export async function searchAndWatchTVShow(query: string) {
  try {
    // 1. Search for content
    const results = await tmdbService.search(query);
    console.log('Search results:', results.length);

    // 2. Track search event
    analyticsService.trackSearch(query, results.length);

    // 3. Get first TV show from results
    const tvShow = results.find(r => r.mediaType === 'tv');
    if (!tvShow) {
      throw new Error('No TV shows found');
    }

    // 4. Get TV show details
    const details = await tmdbService.getTVDetails(tvShow.id);
    console.log('TV show details:', details.title);

    // 5. Track content view
    analyticsService.trackContentView(details.id, 'tv', details.title);

    // 6. Get season details
    const season = await tmdbService.getSeasonDetails(details.id, 1);
    console.log('Episodes in season 1:', season.episodes.length);

    // 7. Extract first episode stream
    const videoData = await extractorService.extractEpisode(details.id, 1, 1);
    console.log('Video sources:', videoData.sources.length);

    // 8. Track playback start
    const episode = season.episodes[0];
    analyticsService.trackPlay(
      `${details.id}-s1e1`,
      'episode',
      0,
      episode.runtime,
      '1080p'
    );

    return { details, season, videoData };
  } catch (error) {
    console.error('Error searching TV show:', error);
    throw error;
  }
}

/**
 * Example: Track complete viewing session
 */
export async function trackViewingSession(
  contentId: string,
  contentType: 'movie' | 'episode',
  duration: number
) {
  const quality = '1080p';

  // Start playback
  analyticsService.trackPlay(contentId, contentType, 0, duration, quality);

  // Simulate watching (track every 30 seconds)
  const interval = setInterval(() => {
    const currentTime = Math.random() * duration;
    analyticsService.trackSeek(contentId, contentType, currentTime, duration, quality);
  }, 30000);

  // Complete after duration
  setTimeout(() => {
    clearInterval(interval);
    analyticsService.trackComplete(contentId, contentType, duration, duration, quality);
    analyticsService.flush(); // Ensure events are sent
  }, duration * 1000);
}

/**
 * Example: Get popular content by genre
 */
export async function getPopularByGenre(mediaType: 'movie' | 'tv') {
  try {
    // 1. Get genres
    const genres = await tmdbService.getGenres(mediaType);
    console.log('Available genres:', genres.map(g => g.name).join(', '));

    // 2. Get popular content
    const popular = mediaType === 'movie'
      ? await tmdbService.getPopularMovies()
      : await tmdbService.getPopularTV();

    // 3. Group by genre
    const byGenre = genres.map(genre => ({
      genre: genre.name,
      content: popular.filter(item =>
        item.genres.some(g => g.id === genre.id)
      ),
    }));

    return byGenre;
  } catch (error) {
    console.error('Error getting popular content:', error);
    throw error;
  }
}

/**
 * Example: Check service health
 */
export async function checkServicesHealth() {
  const health = {
    tmdb: false,
    extractor: false,
  };

  try {
    // Check TMDB by fetching trending
    await tmdbService.getTrending('all', 'day');
    health.tmdb = true;
  } catch (error) {
    console.error('TMDB service unhealthy:', error);
  }

  try {
    // Check extractor service
    health.extractor = await extractorService.healthCheck();
  } catch (error) {
    console.error('Extractor service unhealthy:', error);
  }

  return health;
}

/**
 * Example: Prefetch content for faster loading
 */
export async function prefetchContent(contentId: string, mediaType: 'movie' | 'tv') {
  try {
    // Prefetch in parallel
    const [details, videoData] = await Promise.all([
      tmdbService.getDetails(contentId, mediaType),
      mediaType === 'movie'
        ? extractorService.extractMovie(contentId)
        : null, // For TV, we need season/episode info first
    ]);

    console.log('Prefetched:', details.title);
    return { details, videoData };
  } catch (error) {
    console.error('Error prefetching content:', error);
    throw error;
  }
}

/**
 * Example: Handle errors gracefully
 */
export async function handleServiceErrors() {
  try {
    // This will fail if API key is not set
    await tmdbService.getTrending('movie', 'week');
  } catch (error: any) {
    if (error.code === 'MISSING_API_KEY') {
      console.error('Please configure TMDB API key');
    } else if (error.retryable) {
      console.error('Temporary error, will retry:', error.message);
    } else {
      console.error('Permanent error:', error.message);
    }
  }
}
